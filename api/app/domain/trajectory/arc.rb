class Trajectory
  # A part of a trajectory that follows a planet's surface. `sweep` is the
  # signed angle in radians from `from` to `to`: positive is counter-clockwise.
  Arc = Data.define(:circle, :from, :to, :sweep) do
    def length = circle.radius * sweep.abs
  end
end
