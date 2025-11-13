
// Registry for trait classes
var traitRegistry = new Map()

// Register a trait class
function defineTrait(name, Class) {
  name = name.trim()
  if (name === '') throw new Error('Trait name cannot be empty')
  if (traitRegistry.has(name)) throw new Error(`Trait "${name}" already defined`)
  traitRegistry.set(name, Class)
}

// Map to track element -> trait instance(s)
var elementTraitInstances = new WeakMap()

// Map to track element -> attribute observers
var elementAttributeObservers = new WeakMap()

// Apply trait(s) to an element
function applyTrait(element) {
  var traitNames = element.getAttribute('traits')
  if (!traitNames) return
  var instances = elementTraitInstances.get(element) || []
  var newInstances = []

  for (let traitName of traitNames.split(/\s+/)) {
    if (traitRegistry.has(traitName)) {
      // Only instantiate if not already present for this element
      var already = instances.some(function(inst) { return inst.constructor === traitRegistry.get(traitName) })
      if (!already) {
        var instance = new (traitRegistry.get(traitName))(element)
        instances.push(instance)
        newInstances.push(instance)
      }
    }
  }

  if (instances.length) {
    elementTraitInstances.set(element, instances)
  }

  // Set up attribute observers for new instances
  if (newInstances.length) {
    setupAttributeObserver(element, newInstances)
  }
}

// Handle trait removal when traits attribute changes
function handleTraitChanges(element, oldTraits, newTraits) {
  var oldTraitNames = oldTraits ? oldTraits.split(/\s+/) : []
  var newTraitNames = newTraits ? newTraits.split(/\s+/) : []
  var removedTraits = oldTraitNames.filter(name => !newTraitNames.includes(name))

  if (removedTraits.length > 0) {
    var instances = elementTraitInstances.get(element) || []
    var remainingInstances = []
    var removedInstances = []

    for (let instance of instances) {
      var traitName = getTraitNameFromInstance(instance)
      if (removedTraits.includes(traitName)) {
        removedInstances.push(instance)
        // Call disconnectedCallback if it exists
        call(instance, 'disconnectedCallback')
      } else {
        remainingInstances.push(instance)
      }
    }

    // Update attribute observer to remove instances
    if (removedInstances.length > 0) {
      updateAttributeObserver(element, removedInstances, 'remove')
    }

    if (remainingInstances.length > 0) {
      elementTraitInstances.set(element, remainingInstances)
    } else {
      elementTraitInstances.delete(element)
    }
  }

  // Apply any new traits
  if (newTraits) {
    applyTrait(element)
  }
}

// Helper function to get trait name from instance
function getTraitNameFromInstance(instance) {
  for (let [name, Class] of traitRegistry) {
    if (instance.constructor === Class) {
      return name
    }
  }
  return null
}

// Set up attribute observer for elements with trait instances
function setupAttributeObserver(element, instances) {
  // Collect all observed attributes from all instances
  var observedAttributes = new Set()
  var instancesWithObservedAttributes = []

  for (let instance of instances) {
    var attrs = instance.constructor.observedAttributes
    if (attrs && Array.isArray(attrs)) {
      instancesWithObservedAttributes.push(instance)
      for (let attr of attrs) {
        observedAttributes.add(attr)
      }
    }
  }

  if (observedAttributes.size === 0) return

  // Create or get existing observer for this element
  var existingObserver = elementAttributeObservers.get(element)
  if (existingObserver) {
    // Add new instances to existing observer
    existingObserver.instances = existingObserver.instances.concat(instancesWithObservedAttributes)
    // Update the observer with new attributes
    existingObserver.observer.disconnect()
    var allAttributes = Array.from(new Set([...existingObserver.observedAttributes, ...observedAttributes]))
    existingObserver.observedAttributes = allAttributes
    existingObserver.observer.observe(element, {
      attributes: true,
      attributeOldValue: true,
      attributeFilter: allAttributes
    })
  } else {
    // Create new observer
    var attributeObserver = new MutationObserver(function(records) {
      for (let record of records) {
        var instances = elementAttributeObservers.get(element)?.instances || []
        for (let instance of instances) {
          var observedAttrs = instance.constructor.observedAttributes
          if (observedAttrs && observedAttrs.includes(record.attributeName)) {
            call(instance, 'attributeChangedCallback',
              record.attributeName,
              record.oldValue,
              element.getAttribute(record.attributeName)
            )
          }
        }
      }
    })

    var observedAttributesArray = Array.from(observedAttributes)
    attributeObserver.observe(element, {
      attributes: true,
      attributeOldValue: true,
      attributeFilter: observedAttributesArray
    })

    elementAttributeObservers.set(element, {
      observer: attributeObserver,
      instances: instancesWithObservedAttributes,
      observedAttributes: observedAttributesArray
    })

    // Call attributeChangedCallback for existing attributes
    for (let instance of instancesWithObservedAttributes) {
      var observedAttrs = instance.constructor.observedAttributes
      if (observedAttrs) {
        for (let attr of observedAttrs) {
          if (element.hasAttribute(attr)) {
            call(instance, 'attributeChangedCallback',
              attr,
              null,
              element.getAttribute(attr)
            )
          }
        }
      }
    }
  }
}

// Handle element removals for disconnectedCallback
function handleDisconnections(removedNode) {
  if (removedNode.hasAttribute?.('traits')) {
    handleDisconnect(removedNode)
  }
  // Also check descendants
  for (let descendant of removedNode.querySelectorAll?.('[traits]') ?? []) {
    handleDisconnect(descendant)
  }
}

function handleDisconnect(removedNode) {
  var instances = elementTraitInstances.get(removedNode)
  for (let instance of instances ?? []) {
    call(instance, 'disconnectedCallback')
  }
  elementTraitInstances.delete(removedNode)

  // Clean up attribute observer
  var attributeObserver = elementAttributeObservers.get(removedNode)
  if (attributeObserver) {
    attributeObserver.observer.disconnect()
    elementAttributeObservers.delete(removedNode)
  }
}

// Update attribute observer when instances are added/removed
function updateAttributeObserver(element, instances, operation) {
  var observerData = elementAttributeObservers.get(element)
  if (!observerData) return

  if (operation === 'remove') {
    // Remove instances from observer
    observerData.instances = observerData.instances.filter(inst => !instances.includes(inst))

    if (observerData.instances.length === 0) {
      // No more instances, disconnect observer
      observerData.observer.disconnect()
      elementAttributeObservers.delete(element)
    } else {
      // Recalculate observed attributes
      var newObservedAttributes = new Set()
      for (let instance of observerData.instances) {
        var attrs = instance.constructor.observedAttributes
        if (attrs && Array.isArray(attrs)) {
          for (let attr of attrs) {
            newObservedAttributes.add(attr)
          }
        }
      }

      if (newObservedAttributes.size > 0) {
        observerData.observedAttributes = Array.from(newObservedAttributes)
        observerData.observer.disconnect()
        observerData.observer.observe(element, {
          attributes: true,
          attributeOldValue: true,
          attributeFilter: observerData.observedAttributes
        })
      } else {
        observerData.observer.disconnect()
        elementAttributeObservers.delete(element)
      }
    }
  }
}

// Observe the DOM for elements with the "traits" attribute
var observer = new MutationObserver(function (records) {
  for (let record of records) {
    // Handle attribute changes
    if (record.type === 'attributes' && record.attributeName === 'traits') {
      handleTraitChanges(record.target, record.oldValue, record.target.getAttribute('traits'))
    }

    // Handle node additions
    for (let node of Array.from(record.addedNodes)) {
      if (node.nodeType === 1 && node.hasAttribute?.('traits')) {
        applyTrait(node)
      }
      // Also check descendants
      node.querySelectorAll?.('[traits]').forEach(applyTrait)
    }

    // Handle node removals
    Array.from(record.removedNodes).forEach(handleDisconnections)
  }
})

function call(obj, fn, ...args) {
  if (typeof obj[fn] === 'function') {
    return obj[fn](...args)
  }
}

document.addEventListener('DOMContentLoaded', function() {
  // Apply traits to existing elements on initial load
  document.querySelectorAll('[traits]').forEach(applyTrait)
})

// Start observing the document
observer.observe(document, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeOldValue: true,
  attributeFilter: ['traits']
})

// Expose the trait registration function globally
window.defineTrait = defineTrait
