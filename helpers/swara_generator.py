from dataclasses import dataclass
from itertools import product
from typing import Dict, List, Sequence, Tuple
import unicodedata


@dataclass(frozen=True)
class Raga:
    """Represents a Carnatic Raga with its Arohanam, Avarohanam, and swarasthana pitch ratios."""
    key: str
    name: str
    melakarta_info: str
    arohanam: Tuple[str, ...]
    avarohanam: Tuple[str, ...]
    swara_ratios: Dict[str, float]
    enabled: bool = True


# Just-intonation frequency ratios relative to Shadjam (S = 1.0)
RAGA_REGISTRY: Dict[str, Raga] = {
    "shankarabharanam": Raga(
        key="shankarabharanam",
        name="Shankarabharanam",
        melakarta_info="29th Melakarta (Dheerasankarabharanam)",
        arohanam=("S", "R", "G", "M", "P", "D", "N"),
        avarohanam=("N", "D", "P", "M", "G", "R", "S"),
        swara_ratios={
            "S": 1.0,
            "R": 9 / 8,    # Chatushruti Rishabham (R2)
            "G": 5 / 4,    # Antara Gandharam (G3)
            "M": 4 / 3,    # Shuddha Madhyamam (M1)
            "P": 3 / 2,    # Panchamam (P)
            "D": 5 / 3,    # Chatushruti Dhaivatam (D2)
            "N": 15 / 8,   # Kakali Nishadam (N3)
            "Ṡ": 2.0,
        },
        enabled=True,
    ),
    "mayamalavagowla": Raga(
        key="mayamalavagowla",
        name="Mayamalavagowla",
        melakarta_info="15th Melakarta (Traditional Sarali Raga)",
        arohanam=("S", "R", "G", "M", "P", "D", "N"),
        avarohanam=("N", "D", "P", "M", "G", "R", "S"),
        swara_ratios={
            "S": 1.0,
            "R": 16 / 15,  # Shuddha Rishabham (R1)
            "G": 5 / 4,    # Antara Gandharam (G3)
            "M": 4 / 3,    # Shuddha Madhyamam (M1)
            "P": 3 / 2,    # Panchamam (P)
            "D": 8 / 5,    # Shuddha Dhaivatam (D1)
            "N": 15 / 8,   # Kakali Nishadam (N3)
            "Ṡ": 2.0,
        },
        enabled=False,
    ),
    "mohanam": Raga(
        key="mohanam",
        name="Mohanam",
        melakarta_info="28th Melakarta Janya (Audava Pentatonic)",
        arohanam=("S", "R", "G", "P", "D"),
        avarohanam=("D", "P", "G", "R", "S"),
        swara_ratios={
            "S": 1.0,
            "R": 9 / 8,    # R2
            "G": 5 / 4,    # G3
            "P": 3 / 2,    # P
            "D": 5 / 3,    # D2
            "Ṡ": 2.0,
        },
        enabled=False,
    ),
}


@dataclass
class Tala:
    """Represents a Carnatic rhythmic cycle."""
    name: str
    angas: List[int]       # Aksharas (beats) per anga, e.g., [4, 2, 2] for Adi Tala
    nadai: int = 1         # Swaras per akshara (1 = 1st speed, 2 = 2nd speed)

    @property
    def beats_per_cycle(self) -> int:
        return sum(self.angas)

    @property
    def swaras_per_cycle(self) -> int:
        return self.beats_per_cycle * self.nadai


@dataclass
class ExerciseItem:
    """Represents a single grammatically complete Carnatic practice exercise."""
    title: str
    motif_swaras: str
    pattern_type: str
    carnatic_term: str
    focus: str
    notation_lines: List[str]


class CarnaticSwaraGenerator:
    """
    Generates grammatically strict Carnatic violin exercises bounded within
    one octave [S .. Ṡ] without ungrammatical octave wrapping.
    """

    KARVAI: str = ","

    def __init__(self, raga: Raga) -> None:
        self.raga: Raga = raga
        self.arohanam: List[str] = list(raga.arohanam)
        self.avarohanam: List[str] = list(raga.avarohanam)
        self.tara_sa: str = self._to_tara(self.arohanam[0])
        self.octave_notes: List[str] = self.arohanam + [self.tara_sa]

    @staticmethod
    def _to_tara(swara: str) -> str:
        """Format a swara in Tara sthayi using standard overdot notation (e.g., S -> Ṡ)."""
        dotted = f"{swara[0]}\u0307{swara[1:]}"
        return unicodedata.normalize("NFC", dotted)

    def _enumerate_grammatical_seeds(self, exact_max_leap: int, seed_length: int = 4) -> List[Tuple[int, ...]]:
        """
        Exhaustively enumerate all valid motifs starting at root 0 over the raga's
        bounded 1-octave scale [0 .. N-1] that satisfy Sarali Varisai rules:
          1. Strictly within [0 .. N-1] (1-octave Sthayi boundary)
          2. No adjacent repeated notes: s[i] != s[i+1] (Janta exclusion)
          3. Exact maximum step interval == exact_max_leap
        Sorted progressively by total interval sum -> highest note reached -> lexicographical order.
        """
        n_oct = len(self.octave_notes)
        candidates = [
            seq
            for seq in product([0], *[range(n_oct) for _ in range(seed_length - 1)])
            if all(seq[i] != seq[i + 1] for i in range(seed_length - 1))
            and max(abs(seq[i + 1] - seq[i]) for i in range(seed_length - 1)) == exact_max_leap
        ]
        return sorted(
            candidates,
            key=lambda s: (sum(abs(s[i + 1] - s[i]) for i in range(len(s) - 1)), max(s), s),
        )

    def _format_bounded_motif_exercise(
        self,
        seed: Sequence[int],
        tala: Tala,
    ) -> List[str]:
        """
        Shift a 4-note motif strictly within [0 .. N-1] (S to Ṡ) with ZERO octave wrapping.
        Produces complete 8-beat Adi Tala avartanams for ascending and descending passes.
        """
        n_oct = len(self.octave_notes)
        max_val = max(seed)
        max_shift = (n_oct - 1) - max_val

        asc_chunks: List[List[str]] = [
            [self.octave_notes[x + k] for x in seed]
            for k in range(max_shift + 1)
        ]
        if len(asc_chunks) % 2 == 1:
            asc_chunks.append(list(asc_chunks[-1]))

        desc_base = [(n_oct - 1) - x for x in seed]
        desc_chunks: List[List[str]] = [
            [self.octave_notes[x - k] for x in desc_base]
            for k in range(max_shift + 1)
        ]
        if len(desc_chunks) % 2 == 1:
            desc_chunks.append(list(desc_chunks[-1]))

        lines: List[str] = []
        for chunk_list in (asc_chunks, desc_chunks):
            for i in range(0, len(chunk_list), 2):
                bar8 = chunk_list[i] + chunk_list[i + 1]
                lines.append(self._format_adi_line(bar8, tala))

        return lines

    @staticmethod
    def _format_adi_line(notes_8: List[str], tala: Tala) -> str:
        """Format 8 aksharas into Adi Tala angas: 'S  R  G  M  | P  D  | N  Ṡ  ||'."""
        parts: List[str] = []
        cursor = 0
        for anga_len in tala.angas:
            chunk = notes_8[cursor : cursor + anga_len]
            parts.append("  ".join(chunk))
            cursor += anga_len
        return "  | ".join(parts) + "  ||"

    # -------------------------------------------------------------------------
    # MODULE 1: Bounded Motifs (Alankara Varisai — Exhaustive Max Leap == 1)
    # -------------------------------------------------------------------------
    def generate_bounded_motifs(self, tala: Tala) -> List[ExerciseItem]:
        """
        Exhaustive set of all pure-stepwise 4-note motifs (max leap == 1, no adjacent repeats)
        shifting strictly within [S .. Ṡ] with zero octave wrapping.
        """
        descriptions: Dict[Tuple[int, ...], Tuple[str, str]] = {
            (0, 1, 0, 1): (
                "Adjacent Neighbor Oscillation (U–D–U)",
                "Rapid 1st-finger alternation without tension; strengthens left-hand agility.",
            ),
            (0, 1, 2, 1): (
                "Step-Up & Turnaround Alankara (U–U–D)",
                "Classic Alankara reversal motif; builds clean finger lift and bow-change control.",
            ),
            (0, 1, 2, 3): (
                "Stepwise Linear Ascent & Descent (U–U–U)",
                "Even bow distribution across all 4 fingers on the Sa and Pa strings within one octave.",
            ),
        }

        seeds = self._enumerate_grammatical_seeds(exact_max_leap=1, seed_length=4)
        exercises: List[ExerciseItem] = []

        for idx, seed in enumerate(seeds, start=1):
            motif_str = " – ".join(self.octave_notes[i] for i in seed)
            p_type, focus = descriptions.get(
                seed,
                ("Stepwise Bounded Motif", "Controlled stepwise fingering strictly within one octave."),
            )
            exercises.append(
                ExerciseItem(
                    title=f"Alankara #{idx:02d}: {motif_str}",
                    motif_swaras=motif_str,
                    pattern_type=p_type,
                    carnatic_term="Alankara Varisai (Bounded Stepwise)",
                    focus=focus,
                    notation_lines=self._format_bounded_motif_exercise(seed, tala),
                )
            )
        return exercises

    # -------------------------------------------------------------------------
    # MODULE 2: Cumulative Ceilings (Sarali Sthayi Extensions)
    # -------------------------------------------------------------------------
    def generate_cumulative_ceilings(self, tala: Tala) -> List[ExerciseItem]:
        """
        Progressive ceiling expansion drills anchored to Shadjam (S) or Tara Shadjam (Ṡ),
        mirroring traditional Sarali Varisai rows 9–14.
        """
        s, r, g, m, p, d, n, ts = self.octave_notes

        raw_exercises: List[Tuple[str, str, str, List[str]]] = [
            (
                "Ceiling #01: Madhyama Frame (S → M → S)",
                f"{s} – {r} – {g} – {m}",
                "Sa-String Four-Finger Frame",
                [
                    f"{s}  {r}  {g}  {m}  | {g}  {r}  | {s}  ,  ||",
                    f"{s}  {r}  {g}  {m}  | {m}  {g}  | {r}  {s}  ||",
                ],
            ),
            (
                "Ceiling #02: Panchama Anchor (S → P → S)",
                f"{s} – {r} – {g} – {m} – {p}",
                "Open Pa-String Crossing",
                [
                    f"{s}  {r}  {g}  {m}  | {p}  ,  | {p}  ,  ||",
                    f"{s}  {r}  {g}  {m}  | {p}  {m}  | {g}  {r}  ||",
                    f"{p}  {m}  {g}  {r}  | {s}  {r}  | {g}  {m}  ||",
                    f"{p}  {m}  {g}  {r}  | {s}  ,  | {s}  ,  ||",
                ],
            ),
            (
                "Ceiling #03: Dhaivata Extension (S → D → S)",
                f"{s} – {r} – {g} – {m} – {p} – {d}",
                "1st Finger on Pa String",
                [
                    f"{s}  {r}  {g}  {m}  | {p}  {d}  | {p}  {m}  ||",
                    f"{g}  {r}  {s}  {r}  | {g}  {m}  | {p}  {d}  ||",
                    f"{d}  {p}  {m}  {g}  | {r}  {s}  | {r}  {g}  ||",
                    f"{d}  {p}  {m}  {g}  | {r}  ,  | {s}  ,  ||",
                ],
            ),
            (
                "Ceiling #04: Nishada Extension (S → N → S)",
                f"{s} – {r} – {g} – {m} – {p} – {d} – {n}",
                "2nd Finger on Pa String",
                [
                    f"{s}  {r}  {g}  {m}  | {p}  {d}  | {n}  {d}  ||",
                    f"{p}  {m}  {g}  {r}  | {s}  {r}  | {g}  {m}  ||",
                    f"{s}  {r}  {g}  {m}  | {p}  {d}  | {n}  {d}  ||",
                    f"{n}  {d}  {p}  {m}  | {g}  {r}  | {s}  ,  ||",
                ],
            ),
            (
                "Ceiling #05: Full Cumulative Climb (Sarali Rows 9–14)",
                f"{s} → {p} → {d} → {n} → {ts} → {s}",
                "Classic Progressive Octave Climb",
                [
                    f"{s}  {r}  {g}  {m}  | {p}  ,  | {p}  ,  ||",
                    f"{s}  {r}  {g}  {m}  | {p}  {d}  | {p}  {m}  ||",
                    f"{s}  {r}  {g}  {m}  | {p}  {d}  | {n}  {d}  ||",
                    f"{s}  {r}  {g}  {m}  | {p}  {d}  | {n}  {ts}  ||",
                    f"{ts}  {n}  {d}  {p}  | {m}  {g}  | {r}  {s}  ||",
                ],
            ),
            (
                "Ceiling #06: Descending Tara Anchor (Ṡ → M → G → R → S)",
                f"{ts} → {m} → {g} → {r} → {s}",
                "Upper-Octave Intonation Check",
                [
                    f"{ts}  {n}  {d}  {p}  | {m}  ,  | {m}  ,  ||",
                    f"{ts}  {n}  {d}  {p}  | {m}  {g}  | {m}  {p}  ||",
                    f"{ts}  {n}  {d}  {p}  | {m}  {g}  | {r}  {g}  ||",
                    f"{ts}  {n}  {d}  {p}  | {m}  {g}  | {r}  {s}  ||",
                    f"{s}  {r}  {g}  {m}  | {p}  {d}  | {n}  {ts}  ||",
                ],
            ),
        ]

        focus_map = [
            "Establishes pure intonation across S, R, G, and M before crossing to the open Pa string.",
            "Trains clean bow crossing between M (3rd finger on Sa string) and open P with sustained karvais.",
            "Introduces D (1st finger on Pa string) while anchoring returns to lower Shadjam.",
            "Adds N (2nd finger on Pa string) and checks tuning against open Tara Shadjam.",
            "Traditional Sarali Varisai progressive ceiling climb from P up to Ṡ and full Avarohanam.",
            "Reverses the cumulative drill from open Tara Ṡ downward to reinforce descending pitch memory.",
        ]

        return [
            ExerciseItem(
                title=title,
                motif_swaras=motif,
                pattern_type=p_type,
                carnatic_term="Sarali Sthayi Extensions",
                focus=focus_map[idx],
                notation_lines=lines,
            )
            for idx, (title, motif, p_type, lines) in enumerate(raw_exercises)
        ]

    # -------------------------------------------------------------------------
    # MODULE 3: Bowing & Kala Variations (Sanchara Bowing & Tri-Kala)
    # -------------------------------------------------------------------------
    def generate_bowing_and_kala(self, tala: Tala) -> List[ExerciseItem]:
        """
        Bowing articulation, slur groupings (rendered with curved slur arcs and ⊓/∨ bow markers),
        and speed doubling (Prathama & Dvitiya Kala) on pure Sarali Varisai.
        """
        s, r, g, m, p, d, n, ts = self.octave_notes

        return [
            ExerciseItem(
                title="Bowing #01: Separate Bows (Prathama Kala)",
                motif_swaras=f"{s} {r} {g} {m} | {p} {d} | {n} {ts}",
                pattern_type="1 Full Bow Per Swara (⊓ / ∨)",
                carnatic_term="Prathama Kala — Separate Bowing",
                focus="Use full, even bow strokes (Down ⊓, Up ∨) from frog to tip with steady tone.",
                notation_lines=[
                    f"{s}  {r}  {g}  {m}  | {p}  {d}  | {n}  {ts}  ||",
                    f"{ts}  {n}  {d}  {p}  | {m}  {g}  | {r}  {s}  ||",
                ],
            ),
            ExerciseItem(
                title="Bowing #02: 2-Note Slurs (Jodi Bowing)",
                motif_swaras=f"({s} {r}) ({g} {m}) | ({p} {d}) | ({n} {ts})",
                pattern_type="2 Swaras Per Bow Stroke",
                carnatic_term="Jodi Bowing — Paired Legato Slurs",
                focus="Connect each pair of swaras smoothly in one bow without breaking tone during finger drops.",
                notation_lines=[
                    f"({s}  {r})  ({g}  {m})  | ({p}  {d})  | ({n}  {ts})  ||",
                    f"({ts}  {n})  ({d}  {p})  | ({m}  {g})  | ({r}  {s})  ||",
                ],
            ),
            ExerciseItem(
                title="Bowing #03: Cumulative 2-Note & 4-Note Slurs",
                motif_swaras=f"({s} {r}) ({g} {m}) | ({p} {m}) | ({g} {r})",
                pattern_type="Mixed 2-Note & 4-Note Slurs Across Bars",
                carnatic_term="Sanchara Slur Control",
                focus="Combines 2-note slurs with 4-note slurs spanning across tala bar lines (P D | N Ṡ).",
                notation_lines=[
                    f"({s}  {r})  ({g}  {m})  | ({p}  {m})  | ({g}  {r})  ||",
                    f"({s}  {r}  {g}  {m})  | ({p}  {d}  | {n}  {ts})  ||",
                    f"({ts}  {n})  ({d}  {p})  | ({m}  {p})  | ({d}  {n})  ||",
                    f"({ts}  {n}  {d}  {p})  | ({m}  {g}  | {r}  {s})  ||",
                ],
            ),
            ExerciseItem(
                title="Bowing #04: 4-Note Anga Slurs",
                motif_swaras=f"({s} {r} {g} {m}) | ({p} {d} | {n} {ts})",
                pattern_type="4 Swaras Per Bow Stroke",
                carnatic_term="Anga Bowing — Half-Cycle Slurs",
                focus="Divide bow speed evenly across 4 notes per stroke, including string crossing from M to P.",
                notation_lines=[
                    f"({s}  {r}  {g}  {m})  | ({p}  {d}  | {n}  {ts})  ||",
                    f"({ts}  {n}  {d}  {p})  | ({m}  {g}  | {r}  {s})  ||",
                ],
            ),
            ExerciseItem(
                title="Bowing #05: 2nd Speed Separate Bows (Dvitiya Kala)",
                motif_swaras=f"{s}{r} {g}{m} {p}{d} {n}{ts} | {ts}{n} {d}{p} | {m}{g} {r}{s}",
                pattern_type="2 Swaras Per Akshara (Half-Bow Strokes)",
                carnatic_term="Dvitiya Kala — Separate Bows",
                focus="Completes full Arohanam and Avarohanam in one 8-beat cycle using crisp middle-bow strokes.",
                notation_lines=[
                    f"{s} {r}  {g} {m}  {p} {d}  {n} {ts}  | {ts} {n}  {d} {p}  | {m} {g}  {r} {s}  ||",
                    f"{s} {r}  {g} {m}  {p} {d}  {n} {ts}  | {ts} {n}  {d} {p}  | {m} {g}  {r} {s}  ||",
                ],
            ),
            ExerciseItem(
                title="Bowing #06: 2nd Speed 2-Note Slurs",
                motif_swaras=f"({s} {r}) ({g} {m}) ({p} {d}) ({n} {ts})",
                pattern_type="Dvitiya Kala with Jodi Slurs",
                carnatic_term="Dvitiya Kala — Paired Slurs",
                focus="One bow stroke per akshara beat; builds fluidity for fast-tempo kriti passages.",
                notation_lines=[
                    f"({s} {r})  ({g} {m})  ({p} {d})  ({n} {ts})  | ({ts} {n})  ({d} {p})  | ({m} {g})  ({r} {s})  ||",
                    f"({s} {r})  ({g} {m})  ({p} {d})  ({n} {ts})  | ({ts} {n})  ({d} {p})  | ({m} {g})  ({r} {s})  ||",
                ],
            ),
            ExerciseItem(
                title="Bowing #07: 2nd Speed 4-Note Slurs",
                motif_swaras=f"({s} {r} {g} {m}) ({p} {d} {n} {ts})",
                pattern_type="Dvitiya Kala with 4-Note Slurs",
                carnatic_term="Dvitiya Kala — 4-Swara Slurs",
                focus="Plays the entire Arohanam in 2 bows and Avarohanam in 2 bows.",
                notation_lines=[
                    f"({s} {r} {g} {m})  ({p} {d} {n} {ts})  | ({ts} {n} {d} {p})  | ({m} {g} {r} {s})  ||",
                    f"({s} {r} {g} {m})  ({p} {d} {n} {ts})  | ({ts} {n} {d} {p})  | ({m} {g} {r} {s})  ||",
                ],
            ),
        ]

    # -------------------------------------------------------------------------
    # MODULE 4: Bounded Thirds (Entry-Level Dhatu Varisai — Exhaustive Max Leap == 2)
    # -------------------------------------------------------------------------
    @staticmethod
    def _classify_third_motif(seed: Sequence[int]) -> Tuple[str, str]:
        steps = [seed[i + 1] - seed[i] for i in range(len(seed) - 1)]
        abs_steps = [abs(s) for s in steps]
        contour = "-".join("U" if s > 0 else "D" for s in steps)
        num_skips = sum(1 for s in abs_steps if s == 2)

        if contour == "U-U-U":
            return (
                f"Ascending Single-Skip Scale ({num_skips} Third{'s' if num_skips > 1 else ''})",
                "Trains clean 1st-to-3rd finger spacing without sliding out of tune on upward string crossings.",
            )
        if contour == "U-D-U":
            return (
                "Alternating Dhatu Zig-Zag (Up–Down–Up)",
                "Interleaves ascending thirds and steps across adjacent strings; builds bow-crossing agility.",
            )
        if contour == "U-U-D":
            return (
                "Rise-and-Turn Vakra Third (Up–Up–Down)",
                "Climbs with a third skip and resolves downward; sharpens pitch memory on downward finger drops.",
            )
        return (
            "Skip-and-Cascade Vakra Third (Up–Down–Down)",
            "Leaps up a third and steps down cleanly back toward the anchor finger.",
        )

    def generate_bounded_thirds(self, tala: Tala) -> List[ExerciseItem]:
        """
        Exhaustive set of all 20 single-skip 4-note motifs (max leap == 2, no adjacent repeats)
        strictly bounded within [S .. Ṡ] with zero octave wrapping.
        """
        seeds = self._enumerate_grammatical_seeds(exact_max_leap=2, seed_length=4)
        exercises: List[ExerciseItem] = []

        for idx, seed in enumerate(seeds, start=1):
            motif_str = " – ".join(self.octave_notes[i] for i in seed)
            p_type, focus = self._classify_third_motif(seed)
            exercises.append(
                ExerciseItem(
                    title=f"Bounded Third #{idx:02d}: {motif_str}",
                    motif_swaras=motif_str,
                    pattern_type=p_type,
                    carnatic_term="Entry-Level Dhatu Varisai (Leap ≤ 2)",
                    focus=focus,
                    notation_lines=self._format_bounded_motif_exercise(seed, tala),
                )
            )
        return exercises