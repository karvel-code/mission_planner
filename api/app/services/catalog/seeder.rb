module Catalog
  # Writes a loaded catalog to the database, matching records by slug: new
  # ones are inserted and existing ones updated, so seeding twice changes
  # nothing. Records missing from the file are kept, since saved mission plans
  # may refer to them (docs/ASSUMPTIONS.md #25).
  module Seeder
    module_function

    def call(catalog = Loader.call)
      ActiveRecord::Base.transaction do
        Planet.upsert_all(catalog[:planets], unique_by: :slug) if catalog[:planets].any?
        Spacecraft.upsert_all(catalog[:spacecraft], unique_by: :slug) if catalog[:spacecraft].any?
      end
    end
  end
end
