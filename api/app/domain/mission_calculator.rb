# Plans a whole mission (PLAN.md section 5, mission rules): one trajectory per
# leg, range and time per leg, then the violations and advisories.
#
# Route problems (no destination, a repeated stop, a star, a start away from
# Earth) are reported as violations but do not stop the legs being calculated,
# so a draft still shows its numbers.
class MissionCalculator
  EARTH = "Earth"

  # Range per km travelled: R = Rb + Rp × passengers.
  BASE_RANGE_RATE = 1.0
  PASSENGER_RANGE_RATE = 0.042

  # The planets stay aligned for 42 years.
  WINDOW_HOURS = 42 * 365.25 * 24

  # Used only to express gravity as a multiple of Earth's in messages.
  STANDARD_GRAVITY_M_PER_S2 = 9.80665

  def self.call(...) = new(...).call

  def self.range_used(length_km, passengers) = length_km * (BASE_RANGE_RATE + (PASSENGER_RANGE_RATE * passengers))

  # route      - MissionCalculator::Body values in visiting order, starting with Earth
  # bodies     - every MissionCalculator::Body in the system (the obstacles)
  # spacecraft - a MissionCalculator::Spacecraft
  # passengers - an Integer, fixed for the whole mission
  # thresholds - a MissionCalculator::Thresholds
  def initialize(route:, bodies:, spacecraft:, passengers:, thresholds:)
    @route = route
    @bodies = bodies
    @spacecraft = spacecraft
    @passengers = passengers
    @thresholds = thresholds
  end

  def call
    legs = build_legs

    MissionResult.new(
      spacecraft: @spacecraft,
      passengers: @passengers,
      legs: legs,
      violations: violations(legs),
      advisories: advisories(legs)
    )
  end

  private

  # The first leg leaves the first stop from the surface point facing the next
  # stop; every later leg leaves from where the previous one arrived. A stop
  # repeated straight after itself is skipped, since the ship is already there.
  def build_legs
    circles = @bodies.map(&:circle)
    body_by_circle = @bodies.to_h { |b| [ b.circle, b ] }
    position = nil

    @route.each_cons(2).filter_map do |from, to|
      next if from == to

      position ||= surface_facing(from, to)
      trajectory = TrajectoryCalculator.call(start: position, departure: from.circle, target: to.circle, planets: circles)
      position = trajectory.arrival

      MissionResult::Leg.new(
        from: from,
        to: to,
        trajectory: trajectory,
        bypassed: trajectory.bypassed.map { |c| body_by_circle.fetch(c) },
        range_used: self.class.range_used(trajectory.length, @passengers),
        duration_h: trajectory.length / @spacecraft.speed_kmh
      )
    end
  end

  def surface_facing(from, to)
    direction = to.distance_from_sun_km >= from.distance_from_sun_km ? 1 : -1
    Geometry::Point.new(from.distance_from_sun_km + (direction * from.radius_km), 0)
  end

  # Stops after the first, with their index in the route. The first stop is
  # where the mission starts, not a landing.
  def landing_stops = @route.each_with_index.drop(1)

  # Landing stops that are planets; stars are reported as violations instead.
  def planet_landings = landing_stops.reject { |stop, _| stop.star? }

  def violations(legs)
    [
      *route_violations,
      over_capacity,
      range_exceeded(legs),
      duration_exceeded(legs),
      *temperature_violations
    ].compact
  end

  def route_violations
    if @route.size < 2
      issues = [ issue(:no_destination, "Add at least one destination after the starting planet.") ]
    else
      issues = []
    end

    first = @route.first
    if first && first.name != EARTH
      issues << issue(:must_start_at_earth, "Missions must start at Earth; this one starts at #{first.name}.", planet: first.name)
    end

    landing_stops.each do |stop, index|
      if stop == @route[index - 1]
        issues << stop_issue(:consecutive_duplicate, stop, index, "#{stop.name} appears twice in a row.")
      end
      issues << stop_issue(:star_destination, stop, index, "#{stop.name} is a star and cannot be a destination.") if stop.star?
    end

    issues
  end

  def over_capacity
    return if @passengers <= @spacecraft.capacity

    issue(
      :over_capacity,
      "#{@passengers} passengers exceed #{@spacecraft.name}'s capacity of #{@spacecraft.capacity}.",
      passengers: @passengers, capacity: @spacecraft.capacity
    )
  end

  def range_exceeded(legs)
    needed = legs.sum(0.0, &:range_used)
    return if needed <= @spacecraft.range_km

    over_percent = ((needed / @spacecraft.range_km) - 1) * 100
    issue(
      :range_exceeded,
      "The mission needs #{delimit(needed)} km of range; #{@spacecraft.name} has #{delimit(@spacecraft.range_km)} km " \
      "(#{over_percent.round(1)}% over).",
      range_used: needed, range_km: @spacecraft.range_km
    )
  end

  def duration_exceeded(legs)
    hours = legs.sum(0.0, &:duration_h)
    return if hours <= WINDOW_HOURS

    issue(
      :duration_exceeded,
      "The mission takes #{(hours / (365.25 * 24)).round(1)} years, beyond the 42-year alignment window.",
      duration_h: hours, limit_h: WINDOW_HOURS
    )
  end

  def temperature_violations
    planet_landings.filter_map do |stop, index|
      temperature = stop.average_temperature_c
      next if @spacecraft.operates_at?(temperature)

      message =
        if temperature > @spacecraft.max_operating_temp_c
          "#{stop.name} (#{temperature} °C) exceeds #{@spacecraft.name}'s maximum operating temperature " \
          "of #{@spacecraft.max_operating_temp_c} °C."
        else
          "#{stop.name} (#{temperature} °C) is below #{@spacecraft.name}'s minimum operating temperature " \
          "of #{@spacecraft.min_operating_temp_c} °C."
        end

      stop_issue(
        :temperature_incompatible, stop, index, message,
        temperature_c: temperature,
        min_operating_temp_c: @spacecraft.min_operating_temp_c,
        max_operating_temp_c: @spacecraft.max_operating_temp_c
      )
    end
  end

  def advisories(legs)
    stop_advisories = planet_landings.flat_map do |stop, index|
      [ high_gravity(stop, index), high_radiation(stop, index) ].compact
    end

    [ *stop_advisories, long_mission_without_gravity(legs) ].compact
  end

  def high_gravity(stop, index)
    gravity = stop.gravity_m_per_s2
    return if gravity <= @thresholds.high_gravity_m_per_s2

    times_earth = (gravity / STANDARD_GRAVITY_M_PER_S2).round(1)
    stop_issue(
      :high_gravity, stop, index, "#{stop.name} surface gravity is #{gravity} m/s² (#{times_earth}× Earth's).",
      gravity_m_per_s2: gravity, threshold_m_per_s2: @thresholds.high_gravity_m_per_s2
    )
  end

  def high_radiation(stop, index)
    radiation = stop.radiation_levels_msv
    return if radiation < @thresholds.high_radiation_msv

    stop_issue(
      :high_radiation, stop, index, "#{stop.name} radiation level is #{radiation} mSv.",
      radiation_levels_msv: radiation, threshold_msv: @thresholds.high_radiation_msv
    )
  end

  def long_mission_without_gravity(legs)
    return if @spacecraft.gravity_generator?

    days = legs.sum(0.0, &:duration_h) / 24
    return if days <= @thresholds.max_days_without_gravity_generator

    issue(
      :no_gravity_generator_long_mission,
      "The mission lasts #{days.round(1)} days and #{@spacecraft.name} has no gravity generator.",
      duration_days: days, threshold_days: @thresholds.max_days_without_gravity_generator
    )
  end

  def issue(code, message, **details) = MissionResult::Issue.new(code, message, details)

  def stop_issue(code, stop, index, message, **details)
    issue(code, message, stop_index: index, planet: stop.name, **details)
  end

  # 8178000000.4 → "8,178,000,000"
  def delimit(number) = number.round.to_s.reverse.scan(/\d{1,3}/).join(",").reverse
end
