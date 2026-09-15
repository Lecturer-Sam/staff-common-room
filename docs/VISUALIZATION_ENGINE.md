# Visualization Engine

**Status: concept. Captured 2026-09-13. Not started — deliberately parked.**

An idea the owner raised, recorded here so it isn't lost. This document captures
the vision, the architectural read, and an honest assessment of scale.

---

## The idea

A library of **interactive learning models** for Ghanaian Basic 1–9 classrooms,
where a teacher shows a concept happening rather than describing it.

Not "a plant needs light, water and carbon dioxide" — but a model the learner
can push: raise the light intensity, watch the photosynthesis rate respond.

Target subjects and topics (owner's list):

| Subject | Examples |
|---|---|
| Integrated Science | Photosynthesis, respiration, food chains/webs, water cycle, carbon cycle, states of matter, particle theory, digestion, circulation, reproduction in plants, electrical circuits, forces and motion, simple machines, soil profiles, separation techniques, acids and bases |
| Mathematics | Fractions, equivalent fractions, fraction operations, place value, number lines, angles, transformations, area and perimeter, 3D shapes, coordinate geometry, algebra tiles, ratio, probability, statistics, graphs |
| Computing | Algorithms, flowcharts, binary, networks, block programming, variables, loops, conditionals, data representation, cybersecurity |
| English | Sentence construction, parts of speech, active/passive voice, direct/indirect speech, tenses, punctuation, subject–verb agreement, word formation, comprehension structures |

---

## The architectural insight — and why it's the right one

The owner's framing:

> **Not** "an app containing thousands of pictures."
> **But** "a library of interactive learning models mapped to curriculum indicators."

That distinction is the whole idea. A picture library is a commodity. A model
library keyed to `B6 · Integrated Science · Photosynthesis · indicator code` is
not, because the teacher never searches for "a photosynthesis picture" — they
search for the indicator they're teaching tomorrow.

Proposed record shape:

```text
Subject: Integrated Science
Level: Basic 6
Strand: Diversity of Matter
Topic: Photosynthesis
Indicator: B6.x.x.x.x
Concept: Factors affecting photosynthesis

Visualization:
    photosynthesis-rate-model

Inputs:
    Light
    Carbon dioxide
    Water

Outputs:
    Photosynthesis rate
    Glucose
    Oxygen

Teacher mode:   Explain · Demonstrate · Question · Assess
Learner mode:   Explore · Predict · Manipulate · Discover
```

---

## Why this project is unusually well placed

**The curriculum linkage already exists.** There are 4,040 indicators across 11
grades, each with strand, sub-strand, content standard and indicator code. Every
one of the 13,140 lesson records carries `cs_code` and `ind_code`. Mapping a
visualization to the curriculum is a foreign key, not a research project.

For anyone else, "map our content to the NaCCA curriculum" is months of work.
Here it's a lookup.

**VCTM already specifies the visual half.** The Visual-Conceptual Textbook
Writing Methodology (§12) defines exactly this mapping:

| Knowledge type | Recommended visual |
|---|---|
| Classification | Tree diagram |
| Sequence | Flowchart |
| Comparison | Table |
| Physical structure | Labelled diagram |
| Change over time | Timeline |
| Mathematical relationship | Graph |
| Abstract relationship | Concept map |
| Process | Process diagram |
| Multiple connected ideas | Mind map |
| Scientific system | Model |

VCTM §22 defines a structured content object, and §25 describes one knowledge
model generating many resources. The visualization engine is VCTM's visual layer
made interactive — the two converge rather than compete.

**The four-mode teacher/learner split matches the product promise.** "Explain ·
Demonstrate · Question · Assess" is the same chain as the lesson plan structure
(starter / main / plenary / assessment) already in the data.

---

## Honest assessment of scale

**The ambition is right. The number is not.**

"50 extremely good ones" is the owner's own starting point and it is still very
large. An interactive model is not a diagram — each one is a small piece of
software with:

- a simulation or interaction that must be **correct**, not merely plausible
- subject-matter review by someone who knows the Ghanaian classroom
- pupil-facing UX tested on real children
- maintenance as browsers and curricula change

A conservative estimate is **days per model**, not hours. Fifty models is
several months of focused work — before the offline packaging, the authoring
tooling, or the teacher-facing browse experience.

The risk is not that the idea is wrong. It's that it is the largest possible
scope increase, arriving when nothing has yet been sold.

### The competing pull

The stated priority is revenue as soon as possible. This project converts time
into product, not into money, for a long stretch. It also does not need to exist
for the portal to sell — but the portal selling would fund it.

---

## Recommended sequencing

**1. Pilot: 3–5 models, not 50.**

Pick for maximum demo impact per unit of effort:

- Photosynthesis rate (the owner's example — instantly legible)
- Fractions / equivalent fractions (highest-volume Mathematics pain point)
- Place value (Basic 1–3, very large audience)
- Electrical circuits (simple, visual, satisfying)

Build the **engine and the metadata schema** properly with these few. If the
schema is right, adding model #6 is mostly content work. If it's wrong, you've
only lost a pilot.

**2. Use the pilot as a sales instrument.**

A working photosynthesis model in a proprietor's office sells the portal better
than a brochure. That converts the pilot from cost into revenue support — which
resolves the tension above.

**3. Only then scale the library**, funded by subscriptions.

**4. Offline packs from the start of step 3** — the owner's instinct here is
correct and important. Continuous connectivity cannot be assumed. Design the
pack format (per subject, per class) before the library is large, because
retrofitting offline is harder than building for it.

---

## Open design questions

Not answered yet — these need decisions before any code:

1. **Technology** — SVG/Canvas hand-built per model, or a declarative spec that
   a generic renderer interprets? The second scales far better but constrains
   what a model can do.
2. **Authoring** — who writes model #51? If it's not the owner, the engine needs
   an authoring surface, which is a product in itself.
3. **Correctness** — who verifies a photosynthesis rate curve is right? This is
   the same gap VCTM §27 names: AI-generated, AI-validated, **subject-expert
   verified**.
4. **Devices** — target the cheapest Android phone a Ghanaian teacher actually
   has, not a laptop. This drives rendering choices.
5. **Language** — English only, or vernacular (Twi, Ewe, Ga, Dagbani, Hausa)?

---

## Relationship to other work

```
NaCCA Curriculum
      ↓
Indicator  ←──── 4,040 already mapped ────┐
      ↓                                    │
Lesson (13,140 already written)            │
      ↓                                    │
Visualization  ←── THIS PROJECT ───────────┘
      ↓
Teacher explanation
      ↓
Interactive learner activity
      ↓
Assessment  ←── question bank (currently empty)
```

The visualization engine slots into an existing chain. Its dependencies are the
indicator map (done) and the offline pack format (not started). Its downstream
dependency is the question bank (empty).
