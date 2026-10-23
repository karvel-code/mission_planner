# The shortest path for one leg of a mission. Units are km.
#
# segments       - Trajectory::Line and Trajectory::Arc values, in flight order
# arrival        - the point where the path reaches the target's surface
# bypassed       - circles the path touches, in flight order, excluding the
#                  departure and target planets
# departure_wrap - arc length flown around the departure planet before leaving it
Trajectory = Data.define(:segments, :arrival, :bypassed, :departure_wrap) do
  def length = segments.sum(0.0, &:length)
end
