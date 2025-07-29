# html-traits

**Warning**: This is alpha software and is highly experimental. Although it is
meant to mimic built-in web components the API might change and not all the API
may be implemented.

This library is meant to be similar to built-in web components which uses the
`is` attribute. This uses the `traits` HTML attribute and can handle multiple
traits to one element. It also can be used with any element as it doesn't
inherit the specific element but the element is passed into the class'
constructor.

What are the advantages over web components?

1. Composition over inheritance.
1. Multiple traits to one element.
1. Ordered traits.
1. Built for progressive enhancement.
1. No need for extra elements on your page just to get new runtime behavior.
1. Cleaner HTML.

## Examples

[Example are here.](./index.html)
