FactoryBot.define do
  factory :mission_plan do
    sequence(:name) { |n| "Mission #{n}" }
    spacecraft
    passenger_count { 0 }

    # A valid route by default: Earth (reused, since slugs are unique), then one destination.
    route { [ Planet.find_by(slug: "earth") || association(:planet, :earth), association(:planet) ] }
  end
end
