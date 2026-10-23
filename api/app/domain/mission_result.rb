# The outcome of planning a mission. Units are km, km of range, and hours.
#
# legs        - MissionResult::Leg values, in flight order
# violations  - MissionResult::Issue values that make the mission infeasible
# advisories  - MissionResult::Issue values that are warnings only
MissionResult = Data.define(:spacecraft, :passengers, :legs, :violations, :advisories) do
  def total_length_km = legs.sum(0.0, &:length_km)
  def total_range_used = legs.sum(0.0, &:range_used)
  def total_duration_h = legs.sum(0.0, &:duration_h)

  def feasible? = violations.empty?
end
