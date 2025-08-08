# html-traits

**Warning**: This is alpha software and is highly experimental. Although it is
meant to mimic built-in web components the API might change and not all the API
may be implemented.

[Example are here.](./index.html)

## Introduction

Imagine you want to add multiple interactive behaviors to a single HTML element—maybe an auto-expanding textarea that also validates character limits. With traditional web components, you'd end up with nested wrapper elements cluttering your markup, or you'd be limited to Safari's refusal to support built-in web components.

What if you could simply write `<textarea traits="elastic character-limit">` and be done?

[HTML Traits](https://github.com/jon49/html-traits) is a lightweight JavaScript library that makes this possible. It adds multiple behaviors to existing HTML elements through a simple `traits` attribute, giving you clean, composable functionality without the wrapper element overhead.

While built-in web components offer progressive enhancement through the `is` attribute, they come with significant limitations: Safari doesn't support them, you can only add one behavior per element, and behaviors are tied to specific element types. Regular web components solve some of these issues but force you to wrap your semantic HTML in unnecessary container elements.

### HTML Traits

Enter [`html-traits`](https://github.com/jon49/html-traits). This little library
makes it so you can add multiple behaviors to a single element. It makes it so
you don't need nesting of elements. You just add an attribute. No need for
definitions to be defined with a dash. Some advantages are:

1. Composition over inheritance.
1. Multiple traits to one element.
1. Ordered traits.
1. Built for progressive enhancement.
1. No need for extra elements on your page just to get new runtime behavior.
1. Cleaner HTML.
1. No need to reimplement native element behavior as you just keep the original
   element.
1. Use native HTML for your elements rather than making everything custom and
   needing to learn custom APIs.
1. If you would like to use inheritance for helper functions that you use across
   all your traits it is easy to do so. Although composition over inheritance is
   desirable sometimes inheritance is the best solution.

A use case of this pattern could be a `textarea` element. We would like it to
automatically expand as you type. The old way, using web components, would be to
do this:

```html
<elastic-textarea>
    <textarea></textarea>
</elastic-textarea>
```

But with HTML Traits:

```html
<textarea traits="elastic-textarea"></textarea>
```

But now we would also like to make the `textarea` turn red, if there are more
than 250 characters. The old way:

```html
<elastic-textarea>
    <character-limit data-character-limit="250">
        <textarea></textarea>
    </character-limit>
</elastic-textarea>
```

With HTML Traits:

```html
<textarea traits="elastic-textarea character-limit" maxlength="250">
</textarea>
```

This makes making MPA-first applications much easier and cleaner with reusable
functionality written in a declarative way.

## Limitations

HTML Traits is built specifically for progressive enhancement. It probably isn't
the right library for you if you want to go all into JS. It also doesn't work
with the Shadow DOM. Neither is it a full implementation of web components.
Although I'm trying to follow the same API as web components, it will never be a
true web component.

## A working example

Here's a full implementation of the component `character-limit`.

```js
class CharacterLimit {
    constructor(el) {
        if (!(el instanceof HTMLTextAreaElement)) {
            console.warn(`Expected an HTMLTextAreaElement, but received: ${el} for 'character-limit'.`);
            return
        }

        this.el = el
        this.maxLength = parseInt(this.el.getAttribute('maxlength'), 10);

        if (isNaN(this.maxLength)) {
            console.warn(`Invalid 'maxlength' attribute on element: ${this.el}. Expected a number.`);
            return
        }

        this.threshold = Math.floor(this.maxLength * 0.75);

        this.el.style.outlineColor = 'auto';
        el.addEventListener('input', this);
    }

    disconnectedCallback() {
        // Here we can clean up any resources or event listeners.
        // In this case we do not need to remove the event listener since it
        // will be automatically garbage collected.
        console.log(`CharacterLimit trait disconnected from element: ${this.el}`);
    }

    handleEvent(event) {
        this[event.type]?.(event);
    }

    input() {
        if (this.el.value.length < this.threshold) {
            this.el.style.outlineColor = 'auto';
            return;
        }

        if (this.el.value.length >= this.threshold) {
            this.el.style.outlineColor = 'orange';
        }

        if (this.el.value.length >= this.maxLength - 1) {
            this.el.style.outlineColor = 'red';
        }
    }

}

// Initialize the trait
window.defineTrait('character-limit', CharacterLimit);
```

And below is the HTML. Notice how the native attribute `maxlength` is used? It
is nice to only need to learn as little APIs as possible for a code base. Just
learn HTML and use what is already native! Also, notice in the code above, I
didn't need to implement cutting the text down, it was automatically implemented
by the browser with the attribute `maxlength`!

```html
<head>
    <script type="module" src="./html-traits.js"></script>
    <script type="module" src="./character-limit.js"></script>
</head>

<body>
    <textarea traits="character-limit" maxlength="20"></textarea>
</body>
```
