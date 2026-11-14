(() => {
    // Exhaustive & curated module catalog for Sarali Varisai
    const DEFAULT_MODULES = [
        {
            id: "bounded_motifs",
            number: "01",
            title: "Bounded Motifs",
            carnatic_name: "Alankara Varisai",
            description: "All 3 exhaustive pure-stepwise 4-note motifs shifting strictly within S to \u1E60 with zero octave wrapping.",
            tileClass: "tile-teal",
            exercise_count: 3,
            files: { shankarabharanam: "output/bounded_motifs.md" },
        },
        {
            id: "cumulative_ceilings",
            number: "02",
            title: "Cumulative Ceilings",
            carnatic_name: "Sarali Sthayi Extensions",
            description: "Progressive range expansions (S\u2192M, S\u2192P, S\u2192D, S\u2192N, S\u2192\u1E60) anchored back to Shadjam.",
            tileClass: "tile-cobalt",
            exercise_count: 6,
            files: { shankarabharanam: "output/cumulative_ceilings.md" },
        },
        {
            id: "bowing_and_kala",
            number: "03",
            title: "Bowing & Kala",
            carnatic_name: "Sanchara Bowing & Tri-Kala",
            description: "Separate bows (\u2293 / \u2228), 2-note Jodi slurs, 4-note Anga slurs across bar lines, and 2nd-speed Dvitiya Kala.",
            tileClass: "tile-purple",
            exercise_count: 7,
            files: { shankarabharanam: "output/bowing_and_kala.md" },
        },
        {
            id: "bounded_thirds",
            number: "04",
            title: "Bounded Thirds",
            carnatic_name: "Entry-Level Dhatu Varisai",
            description: "All 20 exhaustive single-skip 4-note motifs (leap \u2264 2) strictly bounded between S and \u1E60.",
            tileClass: "tile-orange",
            exercise_count: 20,
            files: { shankarabharanam: "output/bounded_thirds.md" },
        },
    ];

    // 12 Chromatic Shrutis (C4..B4 for swaras; Tambura drones one octave lower C3..B3)
    const SHRUTI_NOTES = [
        { name: "C", freq4: 261.63 },
        { name: "C#", freq4: 277.18 },
        { name: "D", freq4: 293.66 },
        { name: "D#", freq4: 311.13 },
        { name: "E", freq4: 329.63 }, // Default (3 Katta)
        { name: "F", freq4: 349.23 },
        { name: "F#", freq4: 369.99 },
        { name: "G", freq4: 392.00 },
        { name: "G#", freq4: 415.30 },
        { name: "A", freq4: 440.00 },
        { name: "A#", freq4: 466.16 },
        { name: "B", freq4: 493.88 },
    ];

    const DOWN_BOW = "\u2293";
    const UP_BOW = "\u2228";

    const RAGA_CONFIG = {
        shankarabharanam: {
            name: "Shankarabharanam",
            ratios: {
                S: 1.0,
                R: 9 / 8,
                G: 5 / 4,
                M: 4 / 3,
                P: 3 / 2,
                D: 5 / 3,
                N: 15 / 8,
                "\u1E60": 2.0,
            },
        },
    };

    const COUNTDOWN_SECONDS = 5;
    const LOOP_RESET_GAP_MS = 1000;

    const state = {
        currentView: "home",
        previousView: "home",
        selectedLevel: "sarali",
        selectedRagam: "shankarabharanam",
        selectedModule: null,
        modules: DEFAULT_MODULES,

        exercises: [],
        currentExerciseIdx: 0,
        lineIdx: 0,
        beatIdx: 0,
        isPlaying: false,
        isCountingDown: false,
        speedSec: 1.0,
        orderMode: "serial",
        repeatMode: "loop",
        audioEnabled: true,

        // Tambura State (Defaults: Shruti E, Pa, Volume 50)
        shrutiIndex: 4,
        baseFreq: 329.63,
        tamburaEnabled: true,
        tamburaRunning: false,
        tamburaDroneNote: "Pa",
        tamburaVolume: 50,
        tamburaStep: 0,
        tamburaTimerId: null,
        tamburaMasterGain: null,

        // Timers & Web Audio Handles
        timerId: null,
        gapTimerId: null,
        countdownTimerId: null,
        scrollRafId: null,
        playbackAnchorTime: 0,
        stepCounter: 0,
        audioCtx: null,
        audioUnlocked: false,
        masterCompressor: null,
        activeVoice: null,
        lastSustainedFreq: null,
    };

    // DOM References
    const backBtn = document.getElementById("backBtn");
    const homeBrandBtn = document.getElementById("homeBrandBtn");
    const aboutNavBtn = document.getElementById("aboutNavBtn");
    const breadcrumbNav = document.getElementById("breadcrumbNav");
    const modulesKicker = document.getElementById("modulesKicker");
    const modulesGrid = document.getElementById("modulesGrid");
    const readmeContent = document.getElementById("readmeContent");

    const playalongTopShell = document.getElementById("playalongTopShell");
    const mobilePlayBtn = document.getElementById("mobilePlayBtn");
    const toggleControlsBtn = document.getElementById("toggleControlsBtn");

    const exerciseSelect = document.getElementById("exerciseSelect");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    const speedGroup = document.getElementById("speedGroup");
    const orderGroup = document.getElementById("orderGroup");
    const repeatGroup = document.getElementById("repeatGroup");
    const audioToggleBtn = document.getElementById("audioToggleBtn");
    const playPauseBtn = document.getElementById("playPauseBtn");
    const restartBtn = document.getElementById("restartBtn");

    const tamburaToggleBtn = document.getElementById("tamburaToggleBtn");
    const shrutiSlider = document.getElementById("shrutiSlider");
    const shrutiValue = document.getElementById("shrutiValue");
    const tamburaVolSlider = document.getElementById("tamburaVolSlider");
    const tamburaVolValue = document.getElementById("tamburaVolValue");
    const tamburaRadios = document.querySelectorAll('input[name="tamburaNote"]');

    const exTitle = document.getElementById("exTitle");
    const exMotifBadge = document.getElementById("exMotifBadge");
    const exPatternBadge = document.getElementById("exPatternBadge");
    const exDescription = document.getElementById("exDescription");
    const lineProgress = document.getElementById("lineProgress");
    const beatProgress = document.getElementById("beatProgress");
    const stageContainer = document.getElementById("stageContainer");
    const notationTrack = document.getElementById("notationTrack");

    const countdownOverlay = document.getElementById("countdownOverlay");
    const countdownNumber = document.getElementById("countdownNumber");
    const countdownSub = document.getElementById("countdownSub");

    function syncPlayButtons(label, modeClass) {
        [playPauseBtn, mobilePlayBtn].forEach((btn) => {
            if (!btn) return;
            btn.textContent = label;
            btn.classList.remove("playing", "counting");
            if (modeClass) btn.classList.add(modeClass);
        });
    }

    // ==========================================================================
    // 1. METRO SINGLE-PAGE ROUTER (Practice Level -> Ragam -> Exercise Focus)
    // ==========================================================================
    function navigateTo(viewName) {
        if (state.currentView === "playalong" && viewName !== "playalong") {
            stopAll();
        }

        if (viewName !== "about") {
            state.previousView = state.currentView;
        }

        const targetId = "view-" + viewName;
        const views = document.querySelectorAll(".metro-view");
        views.forEach((v) => {
            if (v.id === targetId) {
                v.classList.remove("exit-left");
                v.classList.add("active-view");
            } else {
                if (v.classList.contains("active-view")) {
                    v.classList.add("exit-left");
                }
                v.classList.remove("active-view");
            }
        });

        state.currentView = viewName;
        if (aboutNavBtn) aboutNavBtn.classList.toggle("active", viewName === "about");
        if (backBtn) backBtn.classList.toggle("hidden", viewName === "home");
        renderBreadcrumbs();

        if (viewName === "playalong") {
            window.setTimeout(drawAllBowingOverlays, 260);
        }
    }

    function handleBackNavigation() {
        if (state.currentView === "about") {
            navigateTo(state.previousView || "home");
        } else if (state.currentView === "playalong") {
            navigateTo("modules");
        } else if (state.currentView === "modules") {
            navigateTo("ragam");
        } else if (state.currentView === "ragam") {
            navigateTo("home");
        }
    }

    function renderBreadcrumbs() {
        if (!breadcrumbNav) return;
        const items = [{ label: "Home", view: "home" }];
        const ragaObj = RAGA_CONFIG[state.selectedRagam];
        const ragaLabel = ragaObj ? ragaObj.name : "Shankarabharanam";

        if (state.currentView === "about") {
            items.push({ label: "About", view: null });
        } else {
            if (["ragam", "modules", "playalong"].includes(state.currentView)) {
                items.push({ label: "Sarali Varisai", view: "ragam" });
            }
            if (["modules", "playalong"].includes(state.currentView)) {
                items.push({ label: ragaLabel, view: "modules" });
            }
            if (state.currentView === "playalong" && state.selectedModule) {
                items.push({ label: state.selectedModule.title, view: null });
            }
        }

        breadcrumbNav.innerHTML = "";
        items.forEach((item, idx) => {
            if (idx > 0) {
                const sep = document.createElement("span");
                sep.className = "crumb-sep";
                sep.textContent = "/";
                breadcrumbNav.appendChild(sep);
            }
            if (item.view && idx < items.length - 1) {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "crumb-item";
                btn.textContent = item.label;
                btn.addEventListener("click", () => navigateTo(item.view));
                breadcrumbNav.appendChild(btn);
            } else {
                const span = document.createElement("span");
                span.className = "crumb-current";
                span.textContent = item.label;
                breadcrumbNav.appendChild(span);
            }
        });
    }

    // ==========================================================================
    // 2. MANIFEST & README LOADER
    // ==========================================================================
    async function initApp() {
        renderModuleTiles(state.modules);
        renderBreadcrumbs();

        try {
            const res = await fetch("output/manifest.json?v=" + Date.now());
            if (res.ok) {
                const manifest = await res.json();
                if (Array.isArray(manifest.modules) && manifest.modules.length > 0) {
                    const classMap = {
                        bounded_motifs: "tile-teal",
                        cumulative_ceilings: "tile-cobalt",
                        bowing_and_kala: "tile-purple",
                        bounded_thirds: "tile-orange",
                    };
                    state.modules = manifest.modules.map((m) =>
                        Object.assign({}, m, { tileClass: classMap[m.id] || "tile-cobalt" })
                    );
                    renderModuleTiles(state.modules);
                }
            }
        } catch (err) {
            console.warn("Using built-in module catalog:", err);
        }

        loadReadmeMarkdown();
    }

    function renderModuleTiles(modules) {
        if (!modulesGrid) return;
        modulesGrid.innerHTML = "";
        modules.forEach((mod) => {
            const tile = document.createElement("button");
            tile.type = "button";
            tile.className = "metro-tile " + (mod.tileClass || "tile-cobalt");

            tile.innerHTML =
                '<div class="tile-top">' +
                '<span class="tile-tag">MODULE ' + mod.number + "</span>" +
                '<span class="tile-arrow">\u2192</span>' +
                "</div>" +
                '<div class="tile-body">' +
                "<h2>" + mod.title + "</h2>" +
                '<p class="tile-italic">' + mod.carnatic_name + "</p>" +
                '<p class="tile-desc">' + mod.description + "</p>" +
                "</div>" +
                '<div class="tile-footer">' + mod.exercise_count + " Exercises \u00B7 Launch Playalong \u2192</div>";

            tile.addEventListener("click", () => {
                state.selectedModule = mod;
                launchPlayalong(mod, state.selectedRagam);
            });

            modulesGrid.appendChild(tile);
        });
    }

    async function loadReadmeMarkdown() {
        if (!readmeContent) return;
        try {
            const res = await fetch("README.md?v=" + Date.now());
            const md = await res.text();
            readmeContent.innerHTML = renderSimpleMarkdown(md);
        } catch (_) {
            readmeContent.innerHTML = "<h1>Project AccompAni</h1><p>README.md could not be loaded.</p>";
        }
    }

    function renderSimpleMarkdown(md) {
        const lines = md.split(/\r?\n/);
        let html = "";
        let inCode = false;
        let inList = false;

        const inlineFormat = (txt) =>
            txt
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/\x60([^\x60]+)\x60/g, "<code>$1</code>")
                .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
                .replace(/\*([^*]+)\*/g, "<em>$1</em>");

        for (const raw of lines) {
            if (raw.trim().startsWith("\x60\x60\x60")) {
                if (inList) {
                    html += "</ul>";
                    inList = false;
                }
                if (!inCode) {
                    html += "<pre><code>";
                    inCode = true;
                } else {
                    html += "</code></pre>";
                    inCode = false;
                }
                continue;
            }
            if (inCode) {
                html += raw.replace(/&/g, "&amp;").replace(/</g, "&lt;") + "\n";
                continue;
            }

            const line = raw.trim();
            if (!line) {
                if (inList) {
                    html += "</ul>";
                    inList = false;
                }
                continue;
            }

            if (line.startsWith("# ")) {
                html += "<h1>" + inlineFormat(line.slice(2)) + "</h1>";
            } else if (line.startsWith("## ")) {
                html += "<h2>" + inlineFormat(line.slice(3)) + "</h2>";
            } else if (line.startsWith("- ") || /^\d+\.\s/.test(line)) {
                if (!inList) {
                    html += "<ul>";
                    inList = true;
                }
                const content = line.replace(/^(- |\d+\.\s)/, "");
                html += "<li>" + inlineFormat(content) + "</li>";
            } else {
                if (inList) {
                    html += "</ul>";
                    inList = false;
                }
                html += "<p>" + inlineFormat(line) + "</p>";
            }
        }
        if (inList) html += "</ul>";
        return html;
    }

    // ==========================================================================
    // 3. WEB AUDIO ENGINE (iOS Safari & Chrome Compatible)
    // ==========================================================================
    async function ensureAudioContext() {
        if (!state.audioCtx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            state.audioCtx = new AudioCtx();

            const comp = state.audioCtx.createDynamicsCompressor();
            comp.threshold.setValueAtTime(-16, state.audioCtx.currentTime);
            comp.knee.setValueAtTime(12, state.audioCtx.currentTime);
            comp.ratio.setValueAtTime(4, state.audioCtx.currentTime);
            comp.attack.setValueAtTime(0.005, state.audioCtx.currentTime);
            comp.release.setValueAtTime(0.15, state.audioCtx.currentTime);
            comp.connect(state.audioCtx.destination);
            state.masterCompressor = comp;
        }

        if (state.audioCtx.state === "suspended") {
            try {
                await state.audioCtx.resume();
            } catch (_) { }
        }

        // Play a 1-sample silent buffer once to unlock Web Audio hardware on iOS Safari
        if (!state.audioUnlocked && state.audioCtx.state === "running") {
            try {
                const buffer = state.audioCtx.createBuffer(1, 1, 22050);
                const source = state.audioCtx.createBufferSource();
                source.buffer = buffer;
                source.connect(state.audioCtx.destination);
                source.start(0);
                state.audioUnlocked = true;
            } catch (_) { }
        }

        return state.audioCtx;
    }

    function getAudioOutputNode() {
        return state.masterCompressor || state.audioCtx.destination;
    }

    function getTamburaGainLevel() {
        return (state.tamburaVolume / 100) * 0.58;
    }

    function pluckTamburaString(stringIdx) {
        if (!state.tamburaRunning || !state.tamburaEnabled || !state.audioCtx || !state.tamburaMasterGain) {
            return;
        }

        const ctx = state.audioCtx;
        const now = ctx.currentTime;
        const s3Freq = state.baseFreq / 2;

        let freq = s3Freq;
        let detuneCents = 0;
        let stringGainScale = 0.9;

        if (stringIdx === 0) {
            freq = state.tamburaDroneNote === "Pa" ? s3Freq * 0.75 : s3Freq * (2 / 3);
            stringGainScale = 0.95;
        } else if (stringIdx === 1) {
            freq = s3Freq;
            detuneCents = -1.2;
            stringGainScale = 0.88;
        } else if (stringIdx === 2) {
            freq = s3Freq;
            detuneCents = 1.5;
            stringGainScale = 0.88;
        } else {
            freq = s3Freq * 0.5;
            stringGainScale = 1.15;
        }

        const ringDuration = 4.2;
        const oscFund = ctx.createOscillator();
        const oscHarm = ctx.createOscillator();
        const jawariFilter = ctx.createBiquadFilter();
        const stringGain = ctx.createGain();
        const harmGain = ctx.createGain();

        oscFund.type = "triangle";
        oscFund.frequency.setValueAtTime(freq, now);
        oscFund.detune.setValueAtTime(detuneCents, now);

        oscHarm.type = "sawtooth";
        oscHarm.frequency.setValueAtTime(freq, now);
        oscHarm.detune.setValueAtTime(detuneCents, now);

        jawariFilter.type = "bandpass";
        jawariFilter.frequency.setValueAtTime(freq * 4.0, now);
        jawariFilter.Q.setValueAtTime(2.2, now);

        harmGain.gain.setValueAtTime(0.45, now);

        stringGain.gain.setValueAtTime(0.0001, now);
        stringGain.gain.linearRampToValueAtTime(0.36 * stringGainScale, now + 0.07);
        stringGain.gain.exponentialRampToValueAtTime(0.0001, now + ringDuration);

        oscFund.connect(stringGain);
        oscHarm.connect(jawariFilter);
        jawariFilter.connect(harmGain);
        harmGain.connect(stringGain);
        stringGain.connect(state.tamburaMasterGain);

        oscFund.start(now);
        oscHarm.start(now);
        oscFund.stop(now + ringDuration + 0.05);
        oscHarm.stop(now + ringDuration + 0.05);
    }

    async function startTambura() {
        if (!state.tamburaEnabled) return;
        const ctx = await ensureAudioContext();
        if (ctx.state !== "running") return;

        if (!state.tamburaMasterGain) {
            state.tamburaMasterGain = ctx.createGain();
            state.tamburaMasterGain.gain.setValueAtTime(getTamburaGainLevel(), ctx.currentTime);
            state.tamburaMasterGain.connect(getAudioOutputNode());
        }

        if (state.tamburaRunning) return;
        state.tamburaRunning = true;
        state.tamburaStep = 0;

        function cycleStrings() {
            if (!state.tamburaRunning) return;
            pluckTamburaString(state.tamburaStep % 4);
            state.tamburaStep += 1;
            state.tamburaTimerId = window.setTimeout(cycleStrings, 750);
        }

        cycleStrings();
    }

    function stopTambura() {
        state.tamburaRunning = false;
        if (state.tamburaTimerId !== null) {
            clearTimeout(state.tamburaTimerId);
            state.tamburaTimerId = null;
        }
        if (state.tamburaMasterGain && state.audioCtx) {
            const now = state.audioCtx.currentTime;
            state.tamburaMasterGain.gain.cancelScheduledValues(now);
            state.tamburaMasterGain.gain.setTargetAtTime(0.0001, now, 0.08);
            const oldGain = state.tamburaMasterGain;
            state.tamburaMasterGain = null;
            window.setTimeout(() => {
                try {
                    oldGain.disconnect();
                } catch (_) { }
            }, 300);
        }
    }

    function stopActiveVoice() {
        if (!state.activeVoice || !state.audioCtx) return;
        try {
            const now = state.audioCtx.currentTime;
            const { gain, osc1, osc2 } = state.activeVoice;
            gain.gain.cancelScheduledValues(now);
            gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.015);
            osc1.stop(now + 0.02);
            osc2.stop(now + 0.02);
        } catch (_) { }
        state.activeVoice = null;
    }

    async function playCountdownTick(secondsLeft) {
        if (!state.audioEnabled) return;
        const ctx = await ensureAudioContext();
        if (ctx.state !== "running") return;

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(secondsLeft === 1 ? 1050 : 750, now);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

        osc.connect(gain);
        gain.connect(getAudioOutputNode());
        osc.start(now);
        osc.stop(now + 0.08);
    }

    async function playSwaraAndBeat(noteObj, beatIndex, durationSec, isSameSlurAsPrev) {
        if (!state.audioEnabled) {
            stopActiveVoice();
            return;
        }
        const ctx = await ensureAudioContext();
        if (ctx.state !== "running") return;

        const now = ctx.currentTime;
        const ratios = (RAGA_CONFIG[state.selectedRagam] || RAGA_CONFIG.shankarabharanam).ratios;
        const normalized = noteObj.swara.normalize("NFC");

        let freq = null;
        if (normalized === ",") {
            freq = state.lastSustainedFreq;
        } else if (ratios[normalized]) {
            freq = state.baseFreq * ratios[normalized];
            state.lastSustainedFreq = freq;
        }

        const isLegatoContinuation = (normalized === "," || Boolean(isSameSlurAsPrev)) && state.activeVoice;

        if (freq) {
            if (isLegatoContinuation) {
                const { osc1, osc2, gain } = state.activeVoice;
                osc1.frequency.setTargetAtTime(freq, now, 0.012);
                osc2.frequency.setTargetAtTime(freq, now, 0.012);
                gain.gain.cancelScheduledValues(now);
                gain.gain.setValueAtTime(0.45, now);
                gain.gain.setValueAtTime(0.45, now + Math.max(0.02, durationSec - 0.015));
                gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec + 0.01);
                try {
                    osc1.stop(now + durationSec + 0.02);
                    osc2.stop(now + durationSec + 0.02);
                } catch (_) { }
            } else {
                stopActiveVoice();
                const attack = Math.min(0.02, durationSec * 0.1);
                const release = Math.min(0.018, durationSec * 0.1);
                const sustainEnd = Math.max(now + attack, now + durationSec - release);

                const osc1 = ctx.createOscillator();
                const osc2 = ctx.createOscillator();
                const osc2Gain = ctx.createGain();
                const filter = ctx.createBiquadFilter();
                const gain = ctx.createGain();

                osc1.type = "triangle";
                osc1.frequency.setValueAtTime(freq, now);

                osc2.type = "sawtooth";
                osc2.frequency.setValueAtTime(freq, now);
                osc2Gain.gain.setValueAtTime(0.28, now);

                filter.type = "lowpass";
                filter.frequency.setValueAtTime(freq * 5.0, now);

                gain.gain.setValueAtTime(0.0001, now);
                gain.gain.linearRampToValueAtTime(0.45, now + attack);
                gain.gain.setValueAtTime(0.45, sustainEnd);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec + 0.01);

                osc1.connect(filter);
                osc2.connect(osc2Gain);
                osc2Gain.connect(filter);
                filter.connect(gain);
                gain.connect(getAudioOutputNode());

                osc1.start(now);
                osc2.start(now);
                osc1.stop(now + durationSec + 0.02);
                osc2.stop(now + durationSec + 0.02);

                state.activeVoice = { osc1, osc2, gain };
            }
        } else {
            stopActiveVoice();
        }

        const clickOsc = ctx.createOscillator();
        const clickGain = ctx.createGain();
        let clickFreq = 660;
        let clickVol = 0.055;

        if (beatIndex === 0) {
            clickFreq = 1140;
            clickVol = 0.13;
        }

        clickOsc.type = "sine";
        clickOsc.frequency.setValueAtTime(clickFreq, now);
        clickGain.gain.setValueAtTime(clickVol, now);
        clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

        clickOsc.connect(clickGain);
        clickGain.connect(getAudioOutputNode());
        clickOsc.start(now);
        clickOsc.stop(now + 0.045);
    }

    // ==========================================================================
    // 4. NOTATION & SLUR BRACKET PARSER + SVG BOWING RENDERER
    // ==========================================================================
    function parseNotationLine(rawLine, lineIdx, totalLines) {
        const isDoubleBar = rawLine.endsWith("||");
        const cleanLine = rawLine.replace(/\|\|$/, "").replace(/\|$/, "").trim();
        const angaStrings = cleanLine.split("|");

        let inSlur = false;
        let currentStrokeId = -1;
        let flatIndex = 0;

        const angas = [];
        const flatNotes = [];
        const strokeGroups = [];

        for (const angaStr of angaStrings) {
            const rawTokens = angaStr.trim().split(/\s+/).filter(Boolean);
            const parsedAngaTokens = [];

            for (const tok of rawTokens) {
                const startsSlur = tok.startsWith("(");
                const endsSlur = tok.endsWith(")");
                const swara = tok.replace(/^\(+/, "").replace(/\)+$/, "");

                if (startsSlur) {
                    inSlur = true;
                    currentStrokeId += 1;
                    strokeGroups.push({
                        strokeId: currentStrokeId,
                        startIdx: flatIndex,
                        endIdx: flatIndex,
                        isSlurred: true,
                        bowDir: currentStrokeId % 2 === 0 ? DOWN_BOW : UP_BOW,
                    });
                } else if (!inSlur) {
                    currentStrokeId += 1;
                    strokeGroups.push({
                        strokeId: currentStrokeId,
                        startIdx: flatIndex,
                        endIdx: flatIndex,
                        isSlurred: false,
                        bowDir: currentStrokeId % 2 === 0 ? DOWN_BOW : UP_BOW,
                    });
                }

                const activeGroup = strokeGroups[strokeGroups.length - 1];
                activeGroup.endIdx = flatIndex;

                const noteObj = {
                    swara: swara,
                    flatIndex: flatIndex,
                    strokeId: currentStrokeId,
                    isSlurred: inSlur,
                    bowDir: activeGroup.bowDir,
                };

                parsedAngaTokens.push(noteObj);
                flatNotes.push(noteObj);
                flatIndex += 1;

                if (endsSlur) {
                    inSlur = false;
                }
            }

            angas.push(parsedAngaTokens);
        }

        return {
            lineNumber: lineIdx + 1,
            direction: lineIdx < Math.ceil(totalLines / 2) ? "Asc" : "Desc",
            angas: angas,
            flatNotes: flatNotes,
            strokeGroups: strokeGroups,
            closingBar: isDoubleBar ? "||" : "|",
        };
    }

    function parseExercisesFromMarkdown(mdText) {
        const sections = mdText.split(/^##\s+/m).slice(1);
        const parsed = [];

        for (const section of sections) {
            const lines = section.split(/\r?\n/);
            const heading = (lines[0] || "").trim();
            if (heading === "Practice Parameters") continue;

            let motifSwaras = "";
            let carnaticTerm = "";
            let patternType = "";
            let focus = "";

            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith("- **Motif Swaras:**")) {
                    motifSwaras = trimmed.replace("- **Motif Swaras:**", "").trim();
                } else if (trimmed.startsWith("- **Carnatic Classification:**")) {
                    carnaticTerm = trimmed.replace("- **Carnatic Classification:**", "").trim();
                } else if (trimmed.startsWith("- **Pattern Type:**")) {
                    patternType = trimmed.replace("- **Pattern Type:**", "").trim();
                } else if (trimmed.startsWith("- **Practice Focus:**")) {
                    focus = trimmed.replace("- **Practice Focus:**", "").trim();
                }
            }

            const codeMatch = section.match(/\x60\x60\x60(?:text)?\s*\n([\s\S]*?)\x60\x60\x60/);
            if (!codeMatch) continue;

            const rawNotationLines = codeMatch[1]
                .split(/\r?\n/)
                .map((l) => l.trim())
                .filter(Boolean);

            const avartanams = rawNotationLines.map((rawLine, idx) =>
                parseNotationLine(rawLine, idx, rawNotationLines.length)
            );

            parsed.push({
                title: heading,
                motifSwaras: motifSwaras,
                carnaticTerm: carnaticTerm,
                patternType: patternType,
                focus: focus,
                avartanams: avartanams,
            });
        }

        return parsed;
    }

    async function launchPlayalong(moduleObj, ragamKey) {
        stopAll();
        state.selectedModule = moduleObj;
        state.selectedRagam = ragamKey;

        const mdPath = (moduleObj.files && moduleObj.files[ragamKey]) || ("output/" + moduleObj.id + ".md");
        const res = await fetch(mdPath + "?v=" + Date.now());
        const mdText = await res.text();
        state.exercises = parseExercisesFromMarkdown(mdText);

        if (exerciseSelect) {
            exerciseSelect.innerHTML = "";
            state.exercises.forEach((ex, idx) => {
                const opt = document.createElement("option");
                opt.value = String(idx);
                opt.textContent = ex.title;
                exerciseSelect.appendChild(opt);
            });
        }

        navigateTo("playalong");
        selectExercise(0, false);
    }

    // ==========================================================================
    // 5. PLAYALONG RENDERING & SVG SLUR ARC ENGINE
    // ==========================================================================
    function loadExerciseIntoView(index, noteActive, scrollIntoView) {
        if (state.exercises.length === 0) return;
        const bounded = ((index % state.exercises.length) + state.exercises.length) % state.exercises.length;
        state.currentExerciseIdx = bounded;
        state.lineIdx = 0;
        state.beatIdx = 0;
        state.lastSustainedFreq = null;
        if (exerciseSelect) exerciseSelect.value = String(bounded);

        const ex = state.exercises[bounded];
        if (exTitle) exTitle.textContent = ex.title;
        if (exMotifBadge) exMotifBadge.textContent = ex.motifSwaras || "Motif";
        if (exPatternBadge) exPatternBadge.textContent = ex.patternType || ex.carnaticTerm || "Exercise";
        if (exDescription) exDescription.textContent = ex.focus;

        renderNotationStage(ex);
        updateHighlight(scrollIntoView, noteActive);
    }

    function selectExercise(index, keepPlaying) {
        loadExerciseIntoView(index, true, true);
        if (keepPlaying) {
            beginImmediatePlayback();
        }
    }

    function renderNotationStage(exercise) {
        if (!notationTrack) return;
        notationTrack.innerHTML = "";

        exercise.avartanams.forEach((av, lIdx) => {
            const rowEl = document.createElement("div");
            rowEl.className = "avartanam-row";
            rowEl.dataset.line = String(lIdx);

            const metaEl = document.createElement("div");
            metaEl.className = "row-meta";
            const lineNumStr = String(av.lineNumber).padStart(2, "0");
            const dirClass = av.direction === "Asc" ? "dir-asc" : "dir-desc";
            metaEl.innerHTML =
                '<span class="row-num">#' + lineNumStr + "</span>" +
                '<span class="dir-tag ' + dirClass + '">' + av.direction + "</span>";

            const cellsEl = document.createElement("div");
            cellsEl.className = "notation-cells";

            av.angas.forEach((angaNotes, aIdx) => {
                const angaSpan = document.createElement("span");
                angaSpan.className = "anga-group";

                angaNotes.forEach((noteObj) => {
                    const noteSpan = document.createElement("span");
                    noteSpan.className = "swara-token";
                    noteSpan.textContent = noteObj.swara;
                    noteSpan.dataset.flatIdx = String(noteObj.flatIndex);

                    noteSpan.addEventListener("click", () => {
                        if (state.gapTimerId !== null) {
                            clearTimeout(state.gapTimerId);
                            state.gapTimerId = null;
                        }
                        if (state.scrollRafId !== null) {
                            cancelAnimationFrame(state.scrollRafId);
                            state.scrollRafId = null;
                        }
                        state.lineIdx = lIdx;
                        state.beatIdx = noteObj.flatIndex;
                        updateHighlight(true, true);
                        playSwaraAndBeat(noteObj, noteObj.flatIndex, state.speedSec, false);
                        if (state.isPlaying) {
                            beginImmediatePlayback();
                        }
                    });

                    angaSpan.appendChild(noteSpan);
                });

                cellsEl.appendChild(angaSpan);

                const barSpan = document.createElement("span");
                barSpan.className = "bar-sep";
                barSpan.textContent = aIdx < av.angas.length - 1 ? "|" : av.closingBar;
                cellsEl.appendChild(barSpan);
            });

            rowEl.appendChild(metaEl);
            rowEl.appendChild(cellsEl);
            notationTrack.appendChild(rowEl);
        });

        requestAnimationFrame(drawAllBowingOverlays);
    }

    function drawAllBowingOverlays() {
        const ex = state.exercises[state.currentExerciseIdx];
        if (!ex || !notationTrack) return;

        const isMobile = window.innerWidth <= 767;
        const rows = notationTrack.querySelectorAll(".avartanam-row");

        rows.forEach((rowEl, lIdx) => {
            const av = ex.avartanams[lIdx];
            if (!av) return;

            const cellsContainer = rowEl.querySelector(".notation-cells");
            if (!cellsContainer) return;

            const existingSvg = cellsContainer.querySelector(".bowing-svg");
            if (existingSvg) existingSvg.remove();

            const containerRect = cellsContainer.getBoundingClientRect();
            if (containerRect.width === 0) return;

            const isActiveLine = rowEl.classList.contains("active-line");
            let svgHeight = isActiveLine ? 48 : 34;
            let arcBaseY = isActiveLine ? 38 : 26;
            let arcLift = isActiveLine ? 13 : 9;
            let bowY = isActiveLine ? 18 : 13;

            if (isMobile) {
                svgHeight = isActiveLine ? 36 : 26;
                arcBaseY = isActiveLine ? 29 : 20;
                arcLift = isActiveLine ? 9 : 6;
                bowY = isActiveLine ? 13 : 10;
            }

            const svgNS = "http://www.w3.org/2000/svg";
            const svg = document.createElementNS(svgNS, "svg");
            svg.setAttribute("class", "bowing-svg");
            svg.setAttribute("viewBox", "0 0 " + containerRect.width + " " + svgHeight);

            av.strokeGroups.forEach((grp) => {
                const startEl = cellsContainer.querySelector('.swara-token[data-flat-idx="' + grp.startIdx + '"]');
                const endEl = cellsContainer.querySelector('.swara-token[data-flat-idx="' + grp.endIdx + '"]');
                if (!startEl || !endEl) return;

                const startRect = startEl.getBoundingClientRect();
                const endRect = endEl.getBoundingClientRect();
                const startCenterX = startRect.left - containerRect.left + startRect.width / 2;

                const bowText = document.createElementNS(svgNS, "text");
                bowText.setAttribute("class", "bow-symbol");
                bowText.setAttribute("x", String(startCenterX));
                bowText.setAttribute("y", String(bowY));
                bowText.textContent = grp.bowDir;
                svg.appendChild(bowText);

                if (grp.isSlurred && grp.endIdx > grp.startIdx) {
                    const x1 = startRect.left - containerRect.left + startRect.width * 0.25;
                    const x2 = endRect.left - containerRect.left + endRect.width * 0.75;
                    const midX = (x1 + x2) / 2;
                    const ctrlY = arcBaseY - arcLift * 2;

                    const path = document.createElementNS(svgNS, "path");
                    path.setAttribute("class", "slur-arc");
                    path.setAttribute(
                        "d",
                        "M " + x1.toFixed(1) + " " + arcBaseY + " Q " + midX.toFixed(1) + " " + ctrlY.toFixed(1) + " " + x2.toFixed(1) + " " + arcBaseY
                    );
                    svg.appendChild(path);
                }
            });

            cellsContainer.appendChild(svg);
        });
    }

    window.addEventListener("resize", () => {
        if (state.currentView === "playalong") {
            drawAllBowingOverlays();
        }
    });

    if (typeof ResizeObserver !== "undefined" && notationTrack) {
        const ro = new ResizeObserver(() => {
            if (state.currentView === "playalong") {
                drawAllBowingOverlays();
            }
        });
        ro.observe(notationTrack);
    }

    function updateHighlight(scrollIntoView, noteActive) {
        const ex = state.exercises[state.currentExerciseIdx];
        if (!ex || !notationTrack) return;

        const totalLines = ex.avartanams.length;
        const activeAv = ex.avartanams[state.lineIdx];
        const totalBeats = activeAv ? activeAv.flatNotes.length : 8;

        if (lineProgress) lineProgress.textContent = "Line " + (state.lineIdx + 1) + " / " + totalLines;
        if (beatProgress) {
            beatProgress.textContent = noteActive
                ? "Beat " + (state.beatIdx + 1) + " / " + totalBeats
                : "Pause (1 s)";
        }

        let lineChanged = false;
        const rows = notationTrack.querySelectorAll(".avartanam-row");
        rows.forEach((row, idx) => {
            const wasActive = row.classList.contains("active-line");
            const isLineActive = idx === state.lineIdx;
            if (wasActive !== isLineActive) lineChanged = true;

            row.classList.toggle("active-line", isLineActive);

            const tokens = row.querySelectorAll(".swara-token");
            tokens.forEach((tok, bIdx) => {
                tok.classList.toggle("active-note", Boolean(noteActive) && isLineActive && bIdx === state.beatIdx);
            });

            if (isLineActive && scrollIntoView) {
                if (idx === 0 && stageContainer) {
                    stageContainer.scrollTop = 0;
                } else {
                    row.scrollIntoView({
                        behavior: state.speedSec >= 0.5 ? "smooth" : "auto",
                        block: "center",
                    });
                }
            }
        });

        if (lineChanged) {
            drawAllBowingOverlays();
            window.setTimeout(drawAllBowingOverlays, 235);
        }
    }

    function scrollToTopThenPauseOneSecond(onReadyToPlay) {
        if (!stageContainer) {
            scheduleOneSecondGap(performance.now(), onReadyToPlay);
            return;
        }

        const startScroll = stageContainer.scrollTop;
        if (startScroll <= 1) {
            stageContainer.scrollTop = 0;
            scheduleOneSecondGap(performance.now(), onReadyToPlay);
            return;
        }

        const scrollDurationMs = 350;
        const scrollStartTime = performance.now();

        function animateScroll(now) {
            if (!state.isPlaying) return;
            const elapsed = now - scrollStartTime;
            const progress = Math.min(1, elapsed / scrollDurationMs);
            const eased = 1 - Math.pow(1 - progress, 3);
            stageContainer.scrollTop = startScroll * (1 - eased);

            if (progress < 1) {
                state.scrollRafId = window.requestAnimationFrame(animateScroll);
            } else {
                stageContainer.scrollTop = 0;
                state.scrollRafId = null;
                scheduleOneSecondGap(performance.now(), onReadyToPlay);
            }
        }

        state.scrollRafId = window.requestAnimationFrame(animateScroll);
    }

    // ==========================================================================
    // 6. 5-SECOND COUNTDOWN + CONTINUOUS DRIFT-FREE PLAYBACK ENGINE
    // ==========================================================================
    function getNextExerciseIndex() {
        const total = state.exercises.length;
        if (total <= 1) return 0;

        if (state.orderMode === "random") {
            let nextIdx = state.currentExerciseIdx;
            while (nextIdx === state.currentExerciseIdx) {
                nextIdx = Math.floor(Math.random() * total);
            }
            return nextIdx;
        }

        return (state.currentExerciseIdx + 1) % total;
    }

    async function startWithCountdown() {
        if (state.exercises.length === 0) return;
        stopAll();
        await ensureAudioContext();

        if (state.tamburaEnabled && !state.tamburaRunning) {
            startTambura();
        }

        updateHighlight(true, true);

        state.isCountingDown = true;
        const countdownStart = performance.now();
        let remaining = COUNTDOWN_SECONDS;

        if (countdownOverlay) countdownOverlay.classList.remove("hidden");
        if (countdownNumber) countdownNumber.textContent = String(remaining);
        if (countdownSub) {
            countdownSub.textContent =
                "Starting at Line " + (state.lineIdx + 1) + ", Beat " + (state.beatIdx + 1) + " (Pace: " + state.speedSec + " s)";
        }
        syncPlayButtons("\u23F8 Cancel (" + remaining + "s)", "counting");
        playCountdownTick(remaining);

        function tickCountdown() {
            if (!state.isCountingDown) return;
            remaining -= 1;

            if (remaining > 0) {
                if (countdownNumber) countdownNumber.textContent = String(remaining);
                syncPlayButtons("\u23F8 Cancel (" + remaining + "s)", "counting");
                playCountdownTick(remaining);

                const elapsedCount = COUNTDOWN_SECONDS - remaining;
                const nextTickTime = countdownStart + elapsedCount * 1000;
                const delay = Math.max(0, nextTickTime - performance.now());
                state.countdownTimerId = window.setTimeout(tickCountdown, delay);
            } else {
                state.isCountingDown = false;
                state.countdownTimerId = null;
                if (countdownOverlay) countdownOverlay.classList.add("hidden");
                beginImmediatePlayback();
            }
        }

        const firstDelay = Math.max(0, countdownStart + 1000 - performance.now());
        state.countdownTimerId = window.setTimeout(tickCountdown, firstDelay);
    }

    async function beginImmediatePlayback() {
        if (state.exercises.length === 0) return;
        if (state.timerId !== null) {
            clearTimeout(state.timerId);
            state.timerId = null;
        }
        if (state.gapTimerId !== null) {
            clearTimeout(state.gapTimerId);
            state.gapTimerId = null;
        }
        if (state.scrollRafId !== null) {
            cancelAnimationFrame(state.scrollRafId);
            state.scrollRafId = null;
        }

        await ensureAudioContext();
        state.isPlaying = true;
        state.playbackAnchorTime = performance.now();
        state.stepCounter = 0;

        syncPlayButtons("\u23F8 Pause", "playing");
        runScheduledStep();
    }

    function scheduleOneSecondGap(gapStartMs, onDone) {
        const gapEndMs = gapStartMs + LOOP_RESET_GAP_MS;
        const waitMs = Math.max(0, gapEndMs - performance.now());

        state.gapTimerId = window.setTimeout(() => {
            state.gapTimerId = null;
            if (!state.isPlaying) return;
            if (typeof onDone === "function") {
                onDone();
            } else {
                state.playbackAnchorTime = performance.now();
                state.stepCounter = 0;
                runScheduledStep();
            }
        }, waitMs);
    }

    function runScheduledStep() {
        if (!state.isPlaying) return;
        const ex = state.exercises[state.currentExerciseIdx];
        if (!ex) return;

        const av = ex.avartanams[state.lineIdx];
        const noteObj = av.flatNotes[state.beatIdx];
        const prevNoteObj = state.beatIdx > 0 ? av.flatNotes[state.beatIdx - 1] : null;
        const isSameSlur = Boolean(prevNoteObj && prevNoteObj.isSlurred && prevNoteObj.strokeId === noteObj.strokeId);

        updateHighlight(true, true);
        playSwaraAndBeat(noteObj, state.beatIdx, state.speedSec, isSameSlur);

        state.stepCounter += 1;
        const beatEndMs = state.playbackAnchorTime + state.stepCounter * (state.speedSec * 1000);
        const delayMs = Math.max(0, beatEndMs - performance.now());

        state.timerId = window.setTimeout(() => {
            state.timerId = null;
            if (!state.isPlaying) return;

            const nextBeat = state.beatIdx + 1;
            if (nextBeat < av.flatNotes.length) {
                state.beatIdx = nextBeat;
                runScheduledStep();
                return;
            }

            const nextLine = state.lineIdx + 1;
            if (nextLine < ex.avartanams.length) {
                state.lineIdx = nextLine;
                state.beatIdx = 0;
                runScheduledStep();
                return;
            }

            stopActiveVoice();
            if (state.repeatMode === "loop") {
                state.lineIdx = 0;
                state.beatIdx = 0;
                updateHighlight(false, false);
                scrollToTopThenPauseOneSecond(() => {
                    beginImmediatePlayback();
                });
            } else {
                const nextExIdx = getNextExerciseIndex();
                loadExerciseIntoView(nextExIdx, false, false);
                scrollToTopThenPauseOneSecond(() => {
                    beginImmediatePlayback();
                });
            }
        }, delayMs);
    }

    function stopAll() {
        state.isPlaying = false;
        state.isCountingDown = false;

        if (state.timerId !== null) {
            clearTimeout(state.timerId);
            state.timerId = null;
        }
        if (state.gapTimerId !== null) {
            clearTimeout(state.gapTimerId);
            state.gapTimerId = null;
        }
        if (state.countdownTimerId !== null) {
            clearTimeout(state.countdownTimerId);
            state.countdownTimerId = null;
        }
        if (state.scrollRafId !== null) {
            cancelAnimationFrame(state.scrollRafId);
            state.scrollRafId = null;
        }

        stopActiveVoice();
        if (countdownOverlay) countdownOverlay.classList.add("hidden");
        syncPlayButtons("\u25B6 Play", null);
    }

    // ==========================================================================
    // 7. EVENT LISTENERS
    // ==========================================================================
    if (backBtn) backBtn.addEventListener("click", handleBackNavigation);
    if (homeBrandBtn) homeBrandBtn.addEventListener("click", () => navigateTo("home"));
    if (aboutNavBtn) {
        aboutNavBtn.addEventListener("click", () => {
            if (state.currentView === "about") {
                handleBackNavigation();
            } else {
                navigateTo("about");
            }
        });
    }

    if (toggleControlsBtn && playalongTopShell) {
        toggleControlsBtn.addEventListener("click", () => {
            const isOpen = playalongTopShell.classList.toggle("controls-open");
            toggleControlsBtn.setAttribute("aria-expanded", String(isOpen));
            window.setTimeout(drawAllBowingOverlays, 50);
        });
    }

    // Step 1 -> Step 2 (Practice Level -> Ragam)
    document.querySelectorAll("[data-select-level]").forEach((btn) => {
        btn.addEventListener("click", () => {
            state.selectedLevel = btn.dataset.selectLevel;
            navigateTo("ragam");
        });
    });

    // Step 2 -> Step 3 (Ragam -> Exercise Focus)
    document.querySelectorAll("[data-select-ragam]").forEach((btn) => {
        btn.addEventListener("click", () => {
            state.selectedRagam = btn.dataset.selectRagam;
            const ragaObj = RAGA_CONFIG[state.selectedRagam];
            if (modulesKicker && ragaObj) {
                modulesKicker.textContent = "STEP 03 \u00B7 SARALI VARISAI \u00B7 " + ragaObj.name.toUpperCase();
            }
            navigateTo("modules");
        });
    });

    if (tamburaToggleBtn) {
        tamburaToggleBtn.addEventListener("click", () => {
            state.tamburaEnabled = !state.tamburaEnabled;
            tamburaToggleBtn.textContent = state.tamburaEnabled ? "Tambura ON" : "Tambura OFF";
            tamburaToggleBtn.classList.toggle("active", state.tamburaEnabled);
            state.tamburaEnabled ? startTambura() : stopTambura();
        });
    }

    if (shrutiSlider) {
        shrutiSlider.addEventListener("input", async (e) => {
            const idx = Number(e.target.value);
            const entry = SHRUTI_NOTES[idx];
            if (!entry) return;
            state.shrutiIndex = idx;
            state.baseFreq = entry.freq4;
            if (shrutiValue) shrutiValue.textContent = entry.name;

            if (state.tamburaEnabled) {
                if (!state.tamburaRunning) {
                    await startTambura();
                } else {
                    pluckTamburaString(1);
                }
            }
        });
    }

    tamburaRadios.forEach((radio) => {
        radio.addEventListener("change", async (e) => {
            if (e.target.checked) {
                state.tamburaDroneNote = e.target.value;
                if (state.tamburaEnabled) {
                    if (!state.tamburaRunning) {
                        await startTambura();
                    } else {
                        pluckTamburaString(0);
                    }
                }
            }
        });
    });

    if (tamburaVolSlider) {
        tamburaVolSlider.addEventListener("input", async (e) => {
            state.tamburaVolume = Number(e.target.value);
            if (tamburaVolValue) tamburaVolValue.textContent = String(state.tamburaVolume);
            await ensureAudioContext();
            if (state.tamburaMasterGain && state.audioCtx) {
                state.tamburaMasterGain.gain.setTargetAtTime(
                    getTamburaGainLevel(),
                    state.audioCtx.currentTime,
                    0.04
                );
            }
            if (state.tamburaEnabled && !state.tamburaRunning && state.tamburaVolume > 0) {
                startTambura();
            }
        });
    }

    async function bootTamburaOnFirstGesture() {
        const ctx = await ensureAudioContext();
        if (ctx.state === "running") {
            if (state.tamburaEnabled && !state.tamburaRunning) {
                startTambura();
            }
            document.removeEventListener("touchstart", bootTamburaOnFirstGesture);
            document.removeEventListener("click", bootTamburaOnFirstGesture);
            document.removeEventListener("pointerup", bootTamburaOnFirstGesture);
            document.removeEventListener("keydown", bootTamburaOnFirstGesture);
        }
    }
    document.addEventListener("touchstart", bootTamburaOnFirstGesture, { passive: true });
    document.addEventListener("click", bootTamburaOnFirstGesture);
    document.addEventListener("pointerup", bootTamburaOnFirstGesture);
    document.addEventListener("keydown", bootTamburaOnFirstGesture);

    if (exerciseSelect) {
        exerciseSelect.addEventListener("change", (e) => {
            const wasPlaying = state.isPlaying;
            stopAll();
            selectExercise(Number(e.target.value), false);
            if (wasPlaying) startWithCountdown();
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener("click", () => {
            const wasPlaying = state.isPlaying;
            stopAll();
            selectExercise(state.currentExerciseIdx - 1, false);
            if (wasPlaying) startWithCountdown();
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener("click", () => {
            const wasPlaying = state.isPlaying;
            const targetIdx =
                state.orderMode === "random"
                    ? getNextExerciseIndex()
                    : state.currentExerciseIdx + 1;
            stopAll();
            selectExercise(targetIdx, false);
            if (wasPlaying) startWithCountdown();
        });
    }

    if (speedGroup) {
        speedGroup.addEventListener("click", (e) => {
            const btn = e.target.closest(".seg-btn");
            if (!btn) return;
            speedGroup.querySelectorAll(".seg-btn").forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            state.speedSec = Number(btn.dataset.speed);

            if (state.isCountingDown) {
                if (countdownSub) {
                    countdownSub.textContent =
                        "Starting at Line " + (state.lineIdx + 1) + ", Beat " + (state.beatIdx + 1) + " (Pace: " + state.speedSec + " s)";
                }
            } else if (state.isPlaying && state.gapTimerId === null && state.scrollRafId === null) {
                beginImmediatePlayback();
            }
        });
    }

    if (orderGroup) {
        orderGroup.addEventListener("click", (e) => {
            const btn = e.target.closest(".seg-btn");
            if (!btn) return;
            orderGroup.querySelectorAll(".seg-btn").forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            state.orderMode = btn.dataset.order;
        });
    }

    if (repeatGroup) {
        repeatGroup.addEventListener("click", (e) => {
            const btn = e.target.closest(".seg-btn");
            if (!btn) return;
            repeatGroup.querySelectorAll(".seg-btn").forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            state.repeatMode = btn.dataset.repeat;
        });
    }

    if (audioToggleBtn) {
        audioToggleBtn.addEventListener("click", () => {
            state.audioEnabled = !state.audioEnabled;
            audioToggleBtn.textContent = state.audioEnabled ? "\uD83D\uDD0A Swaras" : "\uD83D\uDD07 Swaras";
            audioToggleBtn.classList.toggle("active", state.audioEnabled);
            if (!state.audioEnabled) stopActiveVoice();
        });
    }

    function handlePlayPauseToggle() {
        if (state.isPlaying || state.isCountingDown) {
            stopAll();
        } else {
            startWithCountdown();
        }
    }

    if (playPauseBtn) playPauseBtn.addEventListener("click", handlePlayPauseToggle);
    if (mobilePlayBtn) mobilePlayBtn.addEventListener("click", handlePlayPauseToggle);

    if (restartBtn) {
        restartBtn.addEventListener("click", () => {
            const wasActive = state.isPlaying || state.isCountingDown;
            stopAll();
            state.lineIdx = 0;
            state.beatIdx = 0;
            updateHighlight(true, true);
            if (wasActive) startWithCountdown();
        });
    }

    document.addEventListener("keydown", (e) => {
        if (state.currentView !== "playalong") return;
        if (e.target.tagName === "SELECT" || e.target.tagName === "INPUT") return;
        if (e.code === "Space") {
            e.preventDefault();
            handlePlayPauseToggle();
        } else if (e.code === "ArrowRight") {
            if (nextBtn) nextBtn.click();
        } else if (e.code === "ArrowLeft") {
            if (prevBtn) prevBtn.click();
        }
    });

    // Boot
    initApp();
})();