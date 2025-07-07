(function () {
  'use strict'

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
    var instances = []
    for (let traitName of traitNames.split(/\s+/)) {
      if (traitRegistry.has(traitName) && !elementTraitInstances.has(element)) {
        var instance = new (traitRegistry.get(traitName))(element)
        instances.push(instance)
      }
    }
    if (instances.length) {
      elementTraitInstances.set(element, instances)
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
      if (typeof instance.disconnectedCallback === 'function') {
        instance.disconnectedCallback()
      }
    }
    elementTraitInstances.delete(removedNode)
  }

  // Observe the DOM for elements with the "traits" attribute
  var observer = new MutationObserver(function (records) {
    for (let record of records) {
      for (let node of Array.from(record.addedNodes)) {
        if (node.nodeType === 1 && node.hasAttribute?.('traits')) {
          applyTrait(node)
        }
        // Also check descendants
        node.querySelectorAll?.('[traits]').forEach(applyTrait)
      }
      Array.from(record.removedNodes).forEach(handleDisconnections)
    }
  })

  document.addEventListener('DOMContentLoaded', function() {
    // Apply traits to existing elements on initial load
    document.querySelectorAll('[traits]').forEach(applyTrait)
  })

  // Start observing the document
  observer.observe(document, { childList: true, subtree: true })

  // Expose the trait registration function globally
  window.defineTrait = defineTrait

})()