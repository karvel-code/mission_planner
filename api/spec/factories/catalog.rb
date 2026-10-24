# Made-up planets and spacecraft. Use seed_catalog (spec/support/catalog_helpers.rb)
# when a spec needs the real ones.
FactoryBot.define do
  factory :planet do
    sequence(:name) { |n| "Planet #{n}" }
    slug { name.parameterize }
    body_type { "Planet" }
    radius_km { 5_000 }
    sequence(:distance_from_sun_km) { |n| n * 50_000_000 }
    average_temperature_c { 0 }
    gravity_m_per_s2 { 9.8 }
    radiation_levels_msv { 1 }

    trait :earth do
      name { "Earth" }
      radius_km { 6_371 }
      distance_from_sun_km { 149_600_000 }
    end

    trait :star do
      body_type { "Star" }
    end
  end

  factory :spacecraft do
    sequence(:name) { |n| "Spacecraft #{n}" }
    slug { name.parameterize }
    capacity { 10 }
    range_km { 10_000_000_000 }
    speed_kmh { 500_000 }
    gravity_generator { true }
    min_operating_temp_c { -300 }
    max_operating_temp_c { 300 }
  end
end
