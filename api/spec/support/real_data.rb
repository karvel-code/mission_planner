# Bodies and spacecraft from data/data.yml, copied so domain specs need no YAML.
# Field names follow the internal attributes in PLAN.md section 4b; radius_km is
# diameter_km ÷ 2. Info-only fields (moons, weather, mass, ...) are left out.
module RealData
  BODIES = {
    sun: { name: "Sun", body_type: "Star", distance_from_sun_km: 0, radius_km: 695_508,
           average_temperature_c: 5505, gravity_m_per_s2: 274, radiation_levels_msv: 100_000 },
    mercury: { name: "Mercury", body_type: "Planet", distance_from_sun_km: 57_900_000, radius_km: 2_439.5,
               average_temperature_c: 167, gravity_m_per_s2: 3.7, radiation_levels_msv: 1000 },
    venus: { name: "Venus", body_type: "Planet", distance_from_sun_km: 108_200_000, radius_km: 6_052,
             average_temperature_c: 464, gravity_m_per_s2: 8.87, radiation_levels_msv: 800 },
    earth: { name: "Earth", body_type: "Planet", distance_from_sun_km: 149_600_000, radius_km: 6_371,
             average_temperature_c: 15, gravity_m_per_s2: 9.8, radiation_levels_msv: 0.1 },
    mars: { name: "Mars", body_type: "Planet", distance_from_sun_km: 227_900_000, radius_km: 3_389.5,
            average_temperature_c: -65, gravity_m_per_s2: 3.71, radiation_levels_msv: 240 },
    jupiter: { name: "Jupiter", body_type: "Planet", distance_from_sun_km: 778_500_000, radius_km: 69_910,
               average_temperature_c: -110, gravity_m_per_s2: 24.79, radiation_levels_msv: 2000 },
    saturn: { name: "Saturn", body_type: "Planet", distance_from_sun_km: 1_434_000_000, radius_km: 58_230,
              average_temperature_c: -140, gravity_m_per_s2: 10.44, radiation_levels_msv: 1000 },
    uranus: { name: "Uranus", body_type: "Planet", distance_from_sun_km: 2_871_000_000, radius_km: 25_362,
              average_temperature_c: -195, gravity_m_per_s2: 8.69, radiation_levels_msv: 500 },
    neptune: { name: "Neptune", body_type: "Planet", distance_from_sun_km: 4_495_000_000, radius_km: 24_622,
               average_temperature_c: -200, gravity_m_per_s2: 11.15, radiation_levels_msv: 600 }
  }.freeze

  SPACECRAFT = {
    millennial_hopper: { name: "Millennial Hopper", capacity: 5, range_km: 400_000_000, speed_kmh: 500_000,
                         gravity_generator: true, min_operating_temp_c: -300, max_operating_temp_c: 150 },
    star_explorer_1: { name: "Star Explorer 1", capacity: 10, range_km: 1_500_000_000, speed_kmh: 750_000,
                       gravity_generator: false, min_operating_temp_c: -280, max_operating_temp_c: 465 },
    nyx_odyssey: { name: "Nyx Odyssey", capacity: 21, range_km: 8_000_000_000, speed_kmh: 600_000,
                   gravity_generator: true, min_operating_temp_c: -350, max_operating_temp_c: 250 },
    nostromo_ii: { name: "Nostromo II", capacity: 16, range_km: 3_000_000_000, speed_kmh: 800_000,
                   gravity_generator: true, min_operating_temp_c: -305, max_operating_temp_c: 100 },
    serenity_xl: { name: "Serenity XL", capacity: 30, range_km: 15_000_000_000, speed_kmh: 500_000,
                   gravity_generator: true, min_operating_temp_c: -420, max_operating_temp_c: 500 },
    galactica_scout: { name: "Galactica Scout", capacity: 3, range_km: 500_000_000, speed_kmh: 400_000,
                       gravity_generator: false, min_operating_temp_c: -310, max_operating_temp_c: 555 }
  }.freeze
end
