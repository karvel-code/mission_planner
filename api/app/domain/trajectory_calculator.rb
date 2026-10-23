# Shortest path for one leg of a mission (PLAN.md section 5, steps 1–4): a
# visibility graph over tangent points, searched with Dijkstra.
#
# Planets are Geometry::Circle values centred on the x-axis. By symmetry, the
# path is computed in the upper half-plane (y >= 0); its mirror image below the
# axis is equally short.
class TrajectoryCalculator
  # A graph node: a point and the circle it lies on (nil for a free start).
  Node = Data.define(:point, :circle)

  # A graph edge to node index `to`. `circle` is set for arcs, nil for lines.
  Edge = Data.define(:to, :cost, :circle)

  def self.call(...) = new(...).call

  # start     - Geometry::Point where the leg begins, with y >= 0
  # target    - Geometry::Circle the leg must reach
  # planets   - every Geometry::Circle in the system (target and departure included)
  # departure - Geometry::Circle that `start` lies on, if any
  def initialize(start:, target:, planets:, departure: nil)
    raise ArgumentError, "the target cannot also be the departure planet" if target == departure
    if start.y < -Geometry::EPSILON * (departure || target).radius
      raise ArgumentError, "start must be in the upper half-plane (got y = #{start.y})"
    end

    @start = start
    @target = target
    @departure = departure
    # Step 1: every planet except the target is an obstacle, the departure planet included.
    @obstacles = (planets | [ departure ].compact) - [ target ]
  end

  def call
    @nodes = build_nodes
    @edges = build_edges
    distances, previous = shortest_distances
    last, arrival = best_approach(distances)
    raise ArgumentError, "no path reaches the target" if last.nil?

    segments = merge_arcs(path_to(last, previous).map { |from, edge| segment(from, edge) })
    segments << Trajectory::Line.new(@nodes[last].point, arrival)

    Trajectory.new(
      segments: segments,
      arrival: arrival,
      bypassed: bypassed(segments),
      departure_wrap: segments.sum(0.0) { |s| s.is_a?(Trajectory::Arc) && s.circle == @departure ? s.length : 0.0 }
    )
  end

  private

  # Step 2: the start (index 0), then tangent points on every obstacle from the
  # start, from the target's centre, and shared with every other obstacle.
  # Points below the axis are dropped.
  def build_nodes
    nodes = [ Node.new(@start, @departure) ]

    @obstacles.each do |circle|
      tangent_points = Geometry::Tangents.from_point(@start, circle) + Geometry::Tangents.from_point(@target.centre, circle)
      tangent_points.each { |p| nodes << Node.new(p, circle) }
    end

    @obstacles.combination(2) do |a, b|
      Geometry::Tangents.common(a, b).each do |on_a, on_b|
        nodes << Node.new(on_a, a) << Node.new(on_b, b)
      end
    end

    nodes.first(1) + nodes.drop(1).select { |n| n.point.y >= -Geometry::EPSILON * n.circle.radius }
  end

  # Step 3: straight edges between nodes that can see each other, and arc edges
  # between neighbouring nodes on the same circle. Both kinds run both ways.
  def build_edges
    edges = Array.new(@nodes.size) { [] }
    connect = lambda do |i, j, cost, circle = nil|
      edges[i] << Edge.new(j, cost, circle)
      edges[j] << Edge.new(i, cost, circle)
    end

    @nodes.each_index.to_a.combination(2) do |i, j|
      a = @nodes[i]
      b = @nodes[j]
      # A chord between two points on one circle always cuts through it.
      next if a.circle && a.circle == b.circle
      next unless Geometry::Segment.clear?(a.point, b.point, @obstacles)

      connect.call(i, j, a.point.distance_to(b.point))
    end

    @nodes.each_index.group_by { |i| @nodes[i].circle }.each do |circle, indices|
      next if circle.nil?

      indices.sort_by { |i| upper_angle(circle, @nodes[i].point) }.each_cons(2) do |i, j|
        sweep = upper_angle(circle, @nodes[j].point) - upper_angle(circle, @nodes[i].point)
        connect.call(i, j, circle.radius * sweep, circle)
      end
    end

    edges
  end

  # Step 4: Dijkstra from the start over every node. The graph is small (about
  # a hundred nodes for eight planets), so a linear scan for the next node is enough.
  def shortest_distances
    distances = Array.new(@nodes.size, Float::INFINITY)
    previous = Array.new(@nodes.size)
    done = Array.new(@nodes.size, false)
    distances[0] = 0.0

    loop do
      current = @nodes.each_index.reject { |i| done[i] }.min_by { |i| distances[i] }
      break if current.nil? || distances[current].infinite?

      done[current] = true
      @edges[current].each do |edge|
        candidate = distances[current] + edge.cost
        next unless candidate < distances[edge.to]

        distances[edge.to] = candidate
        previous[edge.to] = [ current, edge ]
      end
    end

    [ distances, previous ]
  end

  # The goal edge (step 3): from node P, fly straight at the target's centre and
  # stop at its surface, if nothing is in the way. Returns the node index to
  # leave from and the arrival point that give the shortest total.
  def best_approach(distances)
    best = nil

    @nodes.each_with_index do |node, i|
      next if distances[i].infinite?

      arrival = @target.centre + ((node.point - @target.centre).unit * @target.radius)
      next unless Geometry::Segment.clear?(node.point, arrival, @obstacles)

      total = distances[i] + node.point.distance_to(arrival)
      best = [ total, i, arrival ] if best.nil? || total < best.first
    end

    best&.drop(1)
  end

  # [from_index, edge] steps from the start to node `last`.
  def path_to(last, previous)
    steps = []
    while (step = previous[last])
      steps.unshift(step)
      last = step.first
    end
    steps
  end

  def segment(from, edge)
    a = @nodes[from].point
    b = @nodes[edge.to].point
    return Trajectory::Line.new(a, b) if edge.circle.nil?

    sweep = upper_angle(edge.circle, b) - upper_angle(edge.circle, a)
    Trajectory::Arc.new(edge.circle, a, b, sweep)
  end

  # Joins consecutive arcs on the same circle, which Dijkstra produces when the
  # path passes over several nodes on one planet.
  def merge_arcs(segments)
    segments.each_with_object([]) do |s, merged|
      last = merged.last
      if s.is_a?(Trajectory::Arc) && last.is_a?(Trajectory::Arc) && last.circle == s.circle
        merged[-1] = Trajectory::Arc.new(s.circle, last.from, s.to, last.sweep + s.sweep)
      else
        merged << s
      end
    end
  end

  # Obstacles the path touches, in flight order: any circle an arc follows, or
  # that a line comes within EPSILON × radius of.
  def bypassed(segments)
    candidates = @obstacles - [ @departure ]

    segments.flat_map do |s|
      candidates.select do |c|
        if s.is_a?(Trajectory::Arc)
          s.circle == c
        else
          Geometry::Segment.distance_to_point(c.centre, s.from, s.to) <= c.radius * (1 + Geometry::EPSILON)
        end
      end
    end.uniq
  end

  # Angle of `point` around `circle`, in [-π/2, 3π/2), so that points just
  # below the axis on the far left sort after those on the upper half rather
  # than before them. Arcs between neighbours then stay in the upper half.
  def upper_angle(circle, point)
    angle = circle.angle_of(point)
    angle < -Math::PI / 2 ? angle + (2 * Math::PI) : angle
  end
end
