# frozen_string_literal: true

FactoryBot.define do
  factory :store, class: "StoreResolver::Store" do
    name { "downtown" }
    customer_id { 101 }

    initialize_with { new(name, customer_id) }
  end
end
