
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

// Apply trait(s) to an element
function applyTrait(element) {
  var traitNames = element.getAttribute('traits')
  if (!traitNames) return
  var instances = elementTraitInstances.get(element) || []
  for (let traitName of traitNames.split(/\s+/)) {
    if (traitRegistry.has(traitName)) {
      // Only instantiate if not already present for this element
      var already = instances.some(function(inst) { return inst.constructor === traitRegistry.get(traitName) })
      if (!already) {
        var instance = new (traitRegistry.get(traitName))(element)
        instances.push(instance)
      }
    }
  }
  if (instances.length) {
    elementTraitInstances.set(element, instances)
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
    
    for (let instance of instances) {
      var traitName = getTraitNameFromInstance(instance)
      if (removedTraits.includes(traitName)) {
        // Call disconnectedCallback if it exists
        if (typeof instance.disconnectedCallback === 'function') {
          instance.disconnectedCallback()
        }
      } else {
        remainingInstances.push(instance)
      }
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
    if (typeof instance.disconnectedCallback === 'function') {
      instance.disconnectedCallback()
    }
  }
  elementTraitInstances.delete(removedNode)
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
