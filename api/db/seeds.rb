# Loads planets and spacecraft from the catalog file (MISSION_DATA_PATH, or
# data/data.yml at the repository root). Safe to run repeatedly: records are
# matched by slug and updated in place.
Catalog::Seeder.call

# Sample mission plans so the app has something to show in development. Each
# is created once, by name, and never overwritten, so edits made in the app stay.
if Rails.env.development?
  [
    { name: "Red planet getaway", customer_name: "Okafor family", spacecraft: "serenity-xl", passenger_count: 4,
      notes: "Window seats for the Mars approach.", route: %w[earth mars] },
    { name: "Gas giant grand tour", customer_name: "Acme Corp offsite", spacecraft: "nyx-odyssey", passenger_count: 12,
      route: %w[earth mars jupiter saturn] },
    { name: "Jupiter on a budget", customer_name: "J. Mwangi", spacecraft: "millennial-hopper", passenger_count: 2,
      notes: "Draft: needs a longer-range spacecraft.", route: %w[earth jupiter] },
    { name: "Venus sunrise", customer_name: "Lindqvist & partners", spacecraft: "nostromo-ii", passenger_count: 6,
      notes: "Draft: Venus is too hot for this spacecraft.", route: %w[earth venus] }
  ].each do |sample|
    plan = MissionPlan.find_or_initialize_by(name: sample[:name])
    next if plan.persisted?

    MissionPlans::Save.call(
      plan: plan,
      attributes: sample.slice(:customer_name, :passenger_count, :notes)
                        .merge(spacecraft_id: Spacecraft.find_by!(slug: sample[:spacecraft]).id),
      planet_ids: sample[:route].map { |slug| Planet.find_by!(slug: slug).id }
    )
  end
end
