# Project AccompAni

Every Carnatic violin student knows the space between finishing one set of lessons and waiting for a guru to introduce the next. After completing my *Sarali varisais*, I found myself in that exact phase—needing to solidify my bowing, fingering, and rhythmic stability at my current skill level before stepping up to the next stage.

The breakthrough came when my nephew-in-law, Anirudh—or Ani, as we call him—sang a few *alankarams* for me to shadow on the violin. Playing alongside his voice turned solitary drills into an intuitive musical dialogue, helping me lock into the *tala* and refine my phrasing in real time.

**AccompAni** grew directly out of those play-along sessions with Ani. Built as an exhaustive, grammatically compliant library of practice tracks tailored to each skill level, this project gives learners a structured way to strengthen bowing control, finger placement, and rhythmic confidence—bridging the gap between lessons so you are always ready for what your guru teaches next.

**Project AccompAni** is a grammatically strict Carnatic violin practice companion and interactive playalong designed for students progressing systematically through *Abhyasa Ganam* (technical foundational exercises).

## Pedagogical Philosophy

Every exercise in **AccompAni** adheres strictly to Carnatic *Sthayi* (octave) grammar and first-position Carnatic violin tuning (`.P – S – P – Ṡ`):

- **No Ungrammatical Octave Wrapping:** Phrases stay strictly within **`[S, R, G, M, P, D, N, Ṡ]`**. Ascending lines never drop abruptly from `Ṡ` back to `S`, and descending lines never jump upward mid-phrase.
- **Step-by-Step Skill Progression:** Exercises are organized into four progressive modules inside *Sarali Varisai* before advancing to *Janta Varisai*:
  1. **Bounded Motifs (*Alankara Varisai*):** Exhaustive pure-stepwise 4-note motifs shifting within `[S .. Ṡ]` to build left-hand finger independence and clean `M ↔ P` string crossings.
  2. **Cumulative Ceilings (*Sarali Sthayi Extensions*):** Progressive range expansions (`S → M`, `S → P`, `S → D`, `S → N`, `S → Ṡ`) anchored back to Shadjam for pitch intonation against the Tambura.
  3. **Bowing & Kala (*Sanchara Bowing & Tri-Kala*):** Separate bows (`⊓` Down-bow / `∨` Up-bow), 2-note *Jodi* slurs, 4-note *Anga* slurs spanning across tala bars, and 2nd-speed (*Dvitiya Kala*) exercises.
  4. **Bounded Thirds (*Entry-Level Dhatu Varisai*):** Exhaustive single-skip intervals (`leap ≤ 2`) strictly bounded between `S` and `Ṡ` to train 1st-to-3rd finger spacing.

## How Exhaustiveness & Ragam/Level Compliance Are Guaranteed

Rather than picking notes from the 12 chromatic *swarasthanas*, the generator treats a raga and practice level as a **formal constraint-satisfaction system** over scale degrees:

1. **Ragam Compliance via Scale-Degree Indexing (`0 .. N-1`):**
   Every exercise is generated purely over the ordered scale indices of the chosen raga (`S=0, R=1, G=2, M=3, P=4, D=5, N=6, Ṡ=7` for a 7-note *Sampoorna* raga like Shankarabharanam, or `0..5` for a 5-note *Audava* raga like Mohanam). Because notes are never sampled outside the raga's ordered scale array, **no foreign notes (*anya swaras*) or omitted notes (*varjya swaras*) can ever appear**.
2. **Formal Pruning of the Universal Motif Space ($8^3 = 512$ Candidates):**
   Starting from all possible 4-note sequences rooted at tonic `0` ($s_0 = 0$), four Carnatic grammar and skill-level predicates filter the entire search space exhaustively:
   - **1-Octave *Sthayi* Boundary:** $0 \le s_i \le 7$ and $s_i + k \le 7$ (prevents ungrammatical `Ṡ → S` drops and stays within first-position violin tuning).
   - **No Adjacent Repeats (*Janta* Exclusion):** $s_i \ne s_{i+1}$ (excludes *Janta Varisai* double-strokes).
   - **No Octave Leaps (*Sthayi Varisai* Exclusion):** $\vert{}s_{i+1} - s_i\vert{} < 7$.
   - **Step-Interval Ceiling (*Sarali* Difficulty Tier):**
     - **Module 01 (*Bounded Motifs*, $\max \vert{}s_{i+1} - s_i\vert{} = 1$):** Exhaustively yields **all 3** mathematically possible pure-stepwise 4-note motifs (`S R S R`, `S R G R`, `S R G M`).
     - **Module 04 (*Bounded Thirds*, $\max \vert{}s_{i+1} - s_i\vert{} = 2$):** Exhaustively yields **all 20** mathematically possible single-skip 4-note motifs (from `S R S G` up to `S G P N`), sorted progressively by interval sum and span.
3. **Exhaustive vs. Curated Scope:**
   Modules **01 (3 exercises)** and **04 (20 exercises)** are **mathematically exhaustive** over all valid 4-note seeds. Modules **02 (*Cumulative Ceilings*, 6 exercises)** and **03 (*Bowing & Kala*, 7 exercises)** are **pedagogically curated** canonical drills—since an 8-note cycle has $2^7 = 128$ arbitrary slur partitions, enumerating every possible slur split would include unmusical bowings (such as slurring 7 notes and playing 1 note at the tip).

## Playalong Features

- **Continuous 4-String Tambura:** Synthesized in real time via the Web Audio API, defaulted to **Shruti E** (`3 Katta`), **Pa** string tuning, and **Volume 50**.
- **Violin Bowing & Slur Visualization:** Renders curved slur arcs (`⌒`) and alternating Down-bow (`⊓`) / Up-bow (`∨`) markings directly above the notation, with legato audio phrasing across slurred notes.
- **Cross-Device Responsive UI:** Designed for laptop/desktop, iPad/tablet, and mobile browsers on Chrome and Safari, with a collapsible control bar on small screens so notation stays prominent on a music stand.

## Local Generation & Development

To regenerate the Markdown exercise books in `output/` and preview locally using `uv`:

```bash
uv run main.py