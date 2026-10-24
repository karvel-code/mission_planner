require "rails_helper"

RSpec.describe MissionPlans::Save do
  before { seed_catalog }

  let(:attributes) do
    { name: "Red planet getaway", customer_name: "A. Customer", spacecraft_id: catalog_spacecraft(:serenity_xl).id,
      passenger_count: 10, notes: "Window seats" }
  end

  def route_ids(*keys) = catalog_route(*keys).map(&:id)

  context "with a valid plan" do
    let(:result) { described_class.call(plan: MissionPlan.new, attributes:, planet_ids: route_ids(:earth, :mars)) }
    let(:plan) { result.plan.reload }

    it "saves the plan and its route" do
      expect(result).to be_success
      expect(plan).to have_attributes(name: "Red planet getaway", customer_name: "A. Customer", notes: "Window seats")
      expect(plan.route.map(&:name)).to eq(%w[Earth Mars])
    end

    it "caches the totals: distance, range used for the passengers, duration, and feasibility" do
      expect(plan.total_distance_km).to be_within(1e-3).of(78_290_239.5)
      expect(plan.range_used_km).to be_within(1e-2).of(78_290_239.5 * 1.42)
      expect(plan.duration_hours).to be_within(1e-6).of(78_290_239.5 / 500_000)
      expect(plan.feasible).to be(true)
    end

    it "returns the full mission result" do
      expect(result.mission.legs.size).to eq(1)
      expect(result.mission.total_length_km).to eq(plan.total_distance_km)
    end
  end

  it "saves an infeasible plan as a draft, caching feasible as false" do
    result = described_class.call(
      plan: MissionPlan.new,
      attributes: attributes.merge(spacecraft_id: catalog_spacecraft(:millennial_hopper).id, passenger_count: 0),
      planet_ids: route_ids(:earth, :jupiter)
    )

    expect(result).to be_success
    expect(result.plan.reload.feasible).to be(false)
    expect(result.mission.violations.map(&:code)).to eq([ :range_exceeded ])
  end

  it "uses the advisory thresholds from config/advisories.yml" do
    result = described_class.call(plan: MissionPlan.new, attributes:, planet_ids: route_ids(:earth, :jupiter))

    expect(result.mission.advisories.map(&:code)).to include(:high_gravity)
  end

  context "with an invalid route" do
    let(:result) { described_class.call(plan: MissionPlan.new, attributes:, planet_ids: route_ids(:mars, :jupiter)) }

    it "saves nothing and reports why" do
      expect(result).not_to be_success
      expect(result.plan.errors[:route]).to include("must start at Earth")
      expect(result.mission).to be_nil
      expect(MissionPlan.count).to eq(0)
      expect(MissionStop.count).to eq(0)
    end
  end

  it "reports a planet id that does not exist" do
    result = described_class.call(plan: MissionPlan.new, attributes:, planet_ids: route_ids(:earth) + [ 0 ])

    expect(result).not_to be_success
    expect(result.plan.errors[:route]).to include("includes an unknown planet (id 0)")
    expect(MissionPlan.count).to eq(0)
  end

  context "when updating a saved plan" do
    let!(:plan) { described_class.call(plan: MissionPlan.new, attributes:, planet_ids: route_ids(:earth, :mars)).plan }

    it "replaces the route and recalculates the totals" do
      described_class.call(plan:, planet_ids: route_ids(:earth, :mars, :jupiter))

      expect(plan.reload.route.map(&:name)).to eq(%w[Earth Mars Jupiter])
      expect(plan.total_distance_km).to be > 600_000_000
    end

    it "keeps the route when no planet ids are given, recalculating for the new passenger count" do
      described_class.call(plan:, attributes: { passenger_count: 0 })

      expect(plan.reload.route.map(&:name)).to eq(%w[Earth Mars])
      expect(plan.range_used_km).to be_within(1e-3).of(78_290_239.5)
    end

    it "leaves the saved plan untouched when the update is invalid" do
      result = described_class.call(plan:, attributes: { name: "" }, planet_ids: route_ids(:earth))

      expect(result).not_to be_success
      expect(plan.reload.name).to eq("Red planet getaway")
      expect(plan.route.map(&:name)).to eq(%w[Earth Mars])
    end
  end
end
