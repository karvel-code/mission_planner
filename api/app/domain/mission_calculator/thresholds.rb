class MissionCalculator
  # Limits for non-blocking advisories, from config/advisories.yml.
  #
  # high_gravity_m_per_s2              - warn when a landing stop's gravity is above this
  # high_radiation_msv                 - warn when a landing stop's radiation is at or above this
  # max_days_without_gravity_generator - warn when a mission on a spacecraft without a
  #                                      gravity generator lasts longer than this
  Thresholds = Data.define(:high_gravity_m_per_s2, :high_radiation_msv, :max_days_without_gravity_generator)
end
