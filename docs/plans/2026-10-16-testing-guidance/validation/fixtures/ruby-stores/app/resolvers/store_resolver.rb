# frozen_string_literal: true

# Maps a store name to the order filter used to list that store's orders.
class StoreResolver
  Store = Struct.new(:name, :customer_id)

  STORES = [
    Store.new("downtown", 101),
    Store.new("airport", 202),
    Store.new("online", nil)
  ].freeze

  def initialize(stores = STORES)
    @stores = stores
  end

  def find(name)
    @stores.find { |store| store.name == name }
  end

  # Returns { customer_id: id } for stores tied to a customer, {} otherwise.
  def order_filter(name)
    store = find(name)
    return {} if store.nil? || store.customer_id.nil?

    { customer_id: store.customer_id }
  end

  def customer_id_for(name)
    find(name)&.customer_id
  end
end
