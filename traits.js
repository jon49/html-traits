(function () {
  'use strict';

  // Registry for trait classes
  var traitRegistry = new Map();

  // Register a trait class
  function defineTrait(name, Class) {
    if (traitRegistry.has(name)) throw new Error(`Trait "${name}" already defined`);
    traitRegistry.set(name, Class);
    // After registering, apply this trait to all elements that have it
    document.querySelectorAll('[traits]').forEach(function(element) {
      var traitNames = element.getAttribute('traits');
      if (traitNames && traitNames.split(/\s+/).includes(name)) {
        // Only instantiate if not already present for this element
        var instances = elementTraitInstances.get(element) || [];
        var already = instances.some(function(inst) { return inst instanceof Class; });
        if (!already) {
          var instance = new Class(element);
          instances.push(instance);
          elementTraitInstances.set(element, instances);
        }
      }
    });
  }

  // Map to track element -> trait instance(s)
  var elementTraitInstances = new WeakMap();

  // Apply trait(s) to an element
  function applyTrait(element) {
    var traitNames = element.getAttribute('traits');
    if (!traitNames) return;
    var instances = [];
    traitNames.split(/\s+/).forEach(function(traitName) {
      if (traitRegistry.has(traitName)) {
        var instance = new (traitRegistry.get(traitName))(element);
        instances.push(instance);
      }
    });
    if (instances.length) {
      elementTraitInstances.set(element, instances);
    }
  }

  // Handle element removals for disconnectedCallback
  function handleDisconnections(removedNode) {
    if (removedNode.nodeType === 1 && removedNode.hasAttribute && removedNode.hasAttribute('traits')) {
      var instances = elementTraitInstances.get(removedNode);
      if (instances) {
        instances.forEach(function(instance) {
          if (typeof instance.disconnectedCallback === 'function') {
            instance.disconnectedCallback();
          }
        });
        elementTraitInstances.delete(removedNode);
      }
    }
    // Also check descendants
    if (removedNode.querySelectorAll) {
      removedNode.querySelectorAll('[traits]').forEach(function(descendant) {
        var instances = elementTraitInstances.get(descendant);
        if (instances) {
          instances.forEach(function(instance) {
            if (typeof instance.disconnectedCallback === 'function') {
              instance.disconnectedCallback();
            }
          });
          elementTraitInstances.delete(descendant);
        }
      });
    }
  }

  // Observe the DOM for elements with the "traits" attribute
  var observer = new MutationObserver(function (records) {
    records.forEach(function (record) {
      Array.from(record.addedNodes).forEach(function (node) {
        if (node.nodeType === 1 && node.hasAttribute && node.hasAttribute('traits')) {
          applyTrait(node);
        }
        // Also check descendants
        if (node.querySelectorAll) {
          node.querySelectorAll('[traits]').forEach(applyTrait);
        }
      });
      Array.from(record.removedNodes).forEach(handleDisconnections);
    });
  });

  // Start observing the document
  observer.observe(document, { childList: true, subtree: true });

  // Apply traits to any elements already in the DOM
  document.querySelectorAll('[traits]').forEach(applyTrait);

  // Expose the trait registration function globally
  window.defineTrait = defineTrait;

})();