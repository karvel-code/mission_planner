module Catalog
  # Reads TEC's YAML file (PLAN.md section 4b), checks it, and maps it to
  # internal attributes. This is the only place that reads the catalog file.
  #
  #   Catalog::Loader.call  # => { planets: [{ name:, slug:, ... }], spacecraft: [...] }
  #
  # Every problem in the file is collected and raised together as a
  # Catalog::Loader::Error naming the record and field involved.
  module Loader
    class Error < StandardError; end

    # Checks for field values: a description for error messages, and a test.
    TYPES = {
      string: [ "a non-empty string", ->(v) { v.is_a?(String) && !v.strip.empty? } ],
      number: [ "a number", ->(v) { v.is_a?(Numeric) } ],
      non_negative: [ "a number ≥ 0", ->(v) { v.is_a?(Numeric) && v >= 0 } ],
      positive: [ "a number > 0", ->(v) { v.is_a?(Numeric) && v.positive? } ],
      whole: [ "a whole number ≥ 0", ->(v) { v.is_a?(Integer) && v >= 0 } ],
      boolean: [ "true or false", ->(v) { [ true, false ].include?(v) } ],
      string_list: [ "a list of strings", ->(v) { v.is_a?(Array) && v.all?(String) } ]
    }.freeze

    # YAML field => [type, internal attribute, required?]
    PLANET_FIELDS = {
      "name" => [ :string, :name, true ],
      "type" => [ :string, :body_type, true ],
      "diameter_km" => [ :positive, :radius_km, true ],
      "distance_from_sun_km" => [ :non_negative, :distance_from_sun_km, true ],
      "average_temperature_c" => [ :number, :average_temperature_c, true ],
      "potentially_habitable" => [ :boolean, :potentially_habitable, false ],
      "weather_patterns" => [ :string, :weather_patterns, false ],
      "radiation_levels_msv" => [ :non_negative, :radiation_levels_msv, true ],
      "gravity_m_per_s2" => [ :non_negative, :gravity_m_per_s2, true ],
      "moons" => [ :string_list, :moons, false ]
    }.freeze

    SPACECRAFT_FIELDS = {
      "name" => [ :string, :name, true ],
      "size" => [ :string, :size, false ],
      "mass_kg" => [ :positive, :mass_kg, false ],
      "capacity" => [ :whole, :capacity, true ],
      "range_km" => [ :positive, :range_km, true ],
      "travel_speed_km_per_hour" => [ :positive, :speed_kmh, true ],
      "gravity_generator" => [ :boolean, :gravity_generator, true ],
      "operational_temperature_c_min" => [ :number, :min_operating_temp_c, true ],
      "operational_temperature_c_max" => [ :number, :max_operating_temp_c, true ]
    }.freeze

    module_function

    def default_path = Pathname(ENV.fetch("MISSION_DATA_PATH") { Rails.root.join("../data/data.yml") }).expand_path

    def call(path = default_path)
      raise Error, "Catalog file not found: #{path}" unless File.exist?(path)

      data = parse(path)
      errors = []
      planets = records(data, "planets", PLANET_FIELDS, errors)
      planets.each { |p| p[:attributes] = finish_planet(p[:attributes]) }
      spacecraft = records(data, "spacecrafts", SPACECRAFT_FIELDS, errors)

      check_operating_ranges(spacecraft, errors)
      check_earth(data["planets"], errors) if data.is_a?(Hash) && data["planets"].is_a?(Array)
      check_overlaps(planets, errors)
      raise Error, "Invalid catalog data in #{path}:\n#{errors.map { |e| "  - #{e}" }.join("\n")}" if errors.any?

      {
        planets: planets.map { |p| p[:attributes] },
        spacecraft: spacecraft.map { |s| s[:attributes] }
      }
    end

    def parse(path)
      YAML.safe_load_file(path, aliases: true)
    rescue Psych::Exception => e
      raise Error, "Catalog file #{path} is not valid YAML: #{e.message}"
    end

    # Validates and maps one root list. Returns { label:, attributes: } per
    # valid record; invalid records only add to `errors`.
    def records(data, key, fields, errors)
      list = data.is_a?(Hash) ? data[key] : nil
      unless list.is_a?(Array)
        errors << "#{key} must be a list"
        return []
      end

      seen = {}
      list.each_with_index.filter_map do |raw, index|
        label = "#{key}[#{index}]"
        unless raw.is_a?(Hash)
          errors << "#{label} must be a set of fields"
          next
        end

        label += " (#{raw['name']})" if raw["name"].is_a?(String)
        record_errors = field_errors(raw, fields).map { |e| "#{label}: #{e}" }

        name = raw["name"]
        if name.is_a?(String) && seen.key?(name.parameterize)
          record_errors << "#{label}: duplicate name #{name.inspect}"
        end
        seen[name.parameterize] = true if name.is_a?(String)

        errors.concat(record_errors)
        { label: label, attributes: map(raw, fields) } if record_errors.empty?
      end
    end

    def field_errors(raw, fields)
      fields.filter_map do |field, (type, _, required)|
        value = raw[field]
        if value.nil?
          "#{field} is missing" if required
        else
          description, valid = TYPES.fetch(type)
          "#{field} must be #{description} (got #{value.inspect})" unless valid.call(value)
        end
      end
    end

    def map(raw, fields)
      attributes = { name: raw["name"], slug: raw["name"].parameterize }
      fields.each { |field, (_, attribute, _)| attributes[attribute] = raw[field] }
      attributes.merge(extra_attributes: raw.except(*fields.keys))
    end

    # The YAML gives diameters; trajectories need radii. Moons default to none.
    def finish_planet(attributes)
      attributes.merge(radius_km: attributes[:radius_km] / 2.0, moons: attributes[:moons] || [])
    end

    def check_operating_ranges(spacecraft, errors)
      spacecraft.each do |s|
        min = s[:attributes][:min_operating_temp_c]
        max = s[:attributes][:max_operating_temp_c]
        next if min <= max

        errors << "#{s[:label]}: operational_temperature_c_min (#{min}) is above operational_temperature_c_max (#{max})"
      end
    end

    # Every mission starts at Earth (docs/ASSUMPTIONS.md #21). Checked against
    # the raw list, so an Earth record with a bad field isn't reported as missing.
    def check_earth(raw_planets, errors)
      errors << "planets must include Earth" if raw_planets.none? { |p| p.is_a?(Hash) && p["name"] == "Earth" }
    end

    # Trajectories assume no two bodies overlap or touch (docs/ASSUMPTIONS.md #13).
    def check_overlaps(planets, errors)
      bodies = planets.map { |p| p[:attributes] }.sort_by { |b| b[:distance_from_sun_km] }

      bodies.each_cons(2) do |a, b|
        gap = b[:distance_from_sun_km] - a[:distance_from_sun_km]
        next if gap > a[:radius_km] + b[:radius_km]

        errors << "#{a[:name]} and #{b[:name]} overlap: their centres are #{gap} km apart"
      end
    end
  end
end
