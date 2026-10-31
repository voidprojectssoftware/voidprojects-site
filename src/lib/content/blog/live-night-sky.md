---
title: The Real Sky Behind Every Page
author: Void Projects
description: How the live night sky behind this site works, from a star catalogue to your screen.
date: '2026-10-31'
published: false
tags:
  - engineering
  - astronomy
---

If you are reading this in dark mode, there are stars behind the text. They are not random dots. They are the real night sky, right now, as seen from Memphis, Tennessee, or from wherever you are if you tell the page. Leave the tab open long enough and you will see them drift as the Earth turns.

Why build that for a software company's website? Honestly, because we think it is cool. But it also turned out to be a nice little engineering problem, so here is how it works.

## Where the stars come from

The stars come from the [HYG database](https://www.astronexus.com/projects/hyg), version 41. HYG merges three older catalogues into one: [Hipparcos](https://www.cosmos.esa.int/web/hipparcos) (from the European Space Agency's star-mapping satellite), the Yale Bright Star catalogue, and the Gliese catalogue of nearby stars. For each star it lists where it sits on the celestial sphere (right ascension and declination), how bright it looks from Earth, and a colour index that tells you whether it runs blue or red.

Most of the entries in the full catalogue are far too faint to see. So a small build script keeps only the stars brighter than [apparent magnitude](https://en.wikipedia.org/wiki/Apparent_magnitude) 6.5, which is roughly the limit of the naked eye on a properly dark night. (Magnitude runs backwards: lower numbers are brighter.) That leaves 8,920 stars. The script also drops the Sun, which is technically in there.

Those 8,920 stars then get packed into a tiny binary file. Each star takes just 6 bytes: two for its right ascension, two for its declination, one for brightness and one for colour. Every value is rounded to a precision your eye cannot tell apart at screen scale. The whole file is 53,524 bytes, a little over 50 KB.

The readable JSON version of the same data is about 224 KB. We used to import it straight into the page's JavaScript, and it slowed the first paint. Now the page loads first, and your browser fetches the small binary file afterwards. If that fetch fails, you just get an empty, dark sky, and nothing else breaks.

## Working out your sky

A catalogue position is fixed against the background of space. What you see overhead depends on where you are standing and what time it is, because the Earth is spinning under that background.

The page starts with your device's clock and the longitude of the place it is drawing. Together those give the [local sidereal time](https://en.wikipedia.org/wiki/Sidereal_time), which is a way of saying which slice of the celestial sphere is overhead right now.

Then latitude comes in. For each star, a bit of spherical trigonometry turns its catalogue position into a direction in your local sky: how high above the horizon it is and which compass direction it lies in. Any star that lands below your horizon is thrown out, just as the ground would hide it in real life.

The math lives in a small file with no dependencies. Its own comment sums up the goal: accuracy that "looks right to the eye", not "point a telescope by it". So we skip refinements like atmospheric refraction. Nobody will notice at this scale.

## Onto your screen

Knowing where each star is in the sky is only half of it. The page also needs a viewpoint. Imagine a camera on the ground, facing due south, tilted 52 degrees up from the horizon, with a 96 degree field of view. Every visible star is projected through that camera like a pinhole, which gives it an x and y position on your screen. Stars behind the camera or outside the frame are skipped.

Each star's size and brightness come from its magnitude, and its colour comes from its colour index, blended along a scale from pale blue through white to warm orange. The brightest ones also get a faint glow. On top of that there is a gentle twinkle, and a tiny shift of a few pixels when you move your pointer, which is purely there to give a sense of depth.

## Making it cheap to draw

Thousands of soft dots, every frame, behind every page, could easily be the slowest thing on the site. A few choices keep it light.

First, the stars are not drawn as circles. At startup the page renders a small glowing dot sprite for each of 24 colour buckets, plus a matching halo sprite. Each frame it simply stamps the right sprite onto a canvas at the right size and transparency. Stamping a pre-made image is much cheaper than building and filling a new circle shape for every star.

Second, the heavy trigonometry does not run every frame. The sky moves slowly, so the page reprojects every star at most every 100 milliseconds, which is ten times a second, and reuses those positions for the frames in between. The twinkle uses a precomputed table of sine values instead of calling the sine function thousands of times per frame.

Third, it stops when nobody is looking. If the tab is hidden, or you switch to light mode, the animation loop shuts off.

And if your system asks for reduced motion, the sky draws a single still frame and stays put: no twinkle, no drift.

## Your location, if you want

By default the sky is drawn from Memphis. In dark mode on a wider screen, there is a small label in the bottom-left corner that reads "Our Sky - Memphis, TN". Click it and your browser asks whether to share your location. Nothing happens until you click.

If you say yes, the browser hands over a low-accuracy position, and the sky is redrawn from there, right in your browser. To turn those coordinates into a city name for the label, the page sends them to [BigDataCloud's free reverse-geocoding service](https://www.bigdatacloud.com/docs/free-api/free-reverse-geocode-to-city-api). That is the only place they go.

We do not store your location. There are no cookies for it, nothing in local storage, and nothing is sent to our servers. Reload the page and you are back over Memphis. If you say no, nothing changes.

## One performance lesson

While adding a small dialog that explains the sky, we ran into a classic trap. The dialog's background used a full-screen blur, the frosted glass look that is everywhere these days. Over a static page that is fine. Over a canvas that changes every frame, the browser has to re-blur the entire viewport every single frame.

In a test at 1440 pixels wide, the compositing time went from about 14 milliseconds a frame to about 73. That is the difference between smooth and very noticeably laggy. The fix was boring: drop the blur and use a plain dim overlay. It looks almost the same and costs next to nothing. Anything that blurs what is behind it pays for whatever is moving back there.

## Go look up

That is the whole trick. A trimmed public catalogue, a clock, a location, some old-fashioned spherical trigonometry and a canvas. If you have a clear night where you are, it is still worth stepping outside and seeing the real thing. Ours is just a window to it.
