class Trajectory
  # A straight part of a trajectory, from one point to another.
  Line = Data.define(:from, :to) do
    def length = from.distance_to(to)
  end
end
