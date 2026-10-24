import "./style.css";
import numberSpeedQuestions from "./data/number-speed-questions.json";
import perceptualSpeedQuestions from "./data/perceptual-speed-questions.json";
import reasoningQuestions from "./data/reasoning-questions.json";
import wordMeaningQuestions from "./data/word-meaning-questions.json";

type Question = {
    statement: string;
    options: (string | number)[];
    answer: number;
};

type TestSection = {
    id: "reasoning" | "number-speed" | "perceptual-speed" | "word-meaning";
    title: string;
    description: string;
    instructions: string[];
    questions: Question[];
};

type QuestionResult = {
    id: number;
    section: string;
    correct: boolean;
    timeMs: number | null;
};

type SectionStats = {
    averageCorrectTimeMs: number | null;
    correctPerMinute: number;
    precision: number | null;
};

const sections: TestSection[] = [
    {
        id: "reasoning",
        title: "Razonamiento",
        description: "Relaciones lógicas y comparaciones.",
        instructions: [
            "Lee la comparación entre las dos personas.",
            "Identifica quién cumple mejor la relación que se pregunta.",
            "Selecciona una respuesta y comprueba el resultado antes de continuar.",
        ],
        questions: reasoningQuestions,
    },
    {
        id: "number-speed",
        title: "Rapidez numérica",
        description: "Identificación rápida de números.",
        instructions: [
            "Observa la serie de números que aparece en pantalla.",
            "Busca en las opciones el número que aparece en la serie.",
            "Responde con rapidez, pero verifica la serie antes de seleccionar.",
        ],
        questions: numberSpeedQuestions,
    },
    {
        id: "perceptual-speed",
        title: "Rapidez perceptiva",
        description: "Comparación visual de caracteres.",
        instructions: [
            "Compara las dos filas de letras y caracteres.",
            "Localiza la posición en la que los caracteres no coinciden.",
            "Selecciona el número de la posición diferente.",
        ],
        questions: perceptualSpeedQuestions,
    },
    {
        id: "word-meaning",
        title: "Significado de palabras",
        description: "Relaciones entre palabras y significados.",
        instructions: [
            "Lee las tres palabras que aparecen en cada pregunta.",
            "Encuentra la palabra que no pertenece al mismo grupo de significado.",
            "Selecciona la opción diferente para continuar.",
        ],
        questions: wordMeaningQuestions,
    },
];

for (const section of sections) {
    for (const [index, question] of section.questions.entries()) {
        if (
            !question.statement ||
            !Array.isArray(question.options) ||
            question.options.length === 0 ||
            !Number.isInteger(question.answer) ||
            question.answer < 0 ||
            question.answer >= question.options.length
        ) {
            throw new Error(
                `${section.title}, pregunta ${index + 1}: datos inválidos.`,
            );
        }
    }

    if (section.questions.length === 0) {
        throw new Error(`La sección ${section.title} no contiene preguntas.`);
    }
}

const SECTION_DURATION_OPTIONS = [
    { seconds: 30, label: "30 segundos" },
    { seconds: 60, label: "1 minuto" },
    { seconds: 120, label: "2 minutos" },
    { seconds: 300, label: "5 minutos" },
] as const;
let sectionDuration = 120;
const questionResults = new Map<string, QuestionResult>();
const sectionElapsedTimes = new Map<string, number>();
const sectionScores: number[] = [];
let sectionIndex = 0;
let currentQuestion = 0;
let questionOrder: number[] = [];
let questionStartTime = 0;
let sectionActiveSince = 0;
let remainingTime = 0;
let score = 0;
let answered = false;
let testFinished = false;
let timerInterval: number | undefined;

const app = document.querySelector<HTMLDivElement>("#app")!;

function currentSection(): TestSection {
    return sections[sectionIndex];
}

function currentQuestions(): Question[] {
    return currentSection().questions;
}

function sectionDurationLabel(): string {
    return SECTION_DURATION_OPTIONS.find(
        (option) => option.seconds === sectionDuration,
    )?.label ?? `${sectionDuration} segundos`;
}

function formatTime(seconds: number): string {
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:` +
        `${String(seconds % 60).padStart(2, "0")}`;
}

function shuffleIndices(length: number): number[] {
    const indices = Array.from({ length }, (_, index) => index);
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
}

function renderStartScreen() {
    app.innerHTML = `
        <main class="test start-screen">
            <p class="eyebrow">Evaluación de aptitud</p>
            <div id="test-options" class="test-options">
                <label for="section-duration">Tiempo por sección</label>
                <select id="section-duration">
                    ${SECTION_DURATION_OPTIONS.map(
                        (option) => `
                            <option value="${option.seconds}"${
                                option.seconds === sectionDuration ? " selected" : ""
                            }>
                                ${option.label}
                            </option>
                        `,
                    ).join("")}
                </select>
            </div>
            <h1>Test de aptitud</h1>
            <p>Completarás cuatro secciones, una por cada tipo de pregunta.</p>
            <div class="section-overview">
                ${sections.map(
                    (section, index) => `
                        <div class="section-card">
                            <span class="section-number">${index + 1}</span>
                            <div>
                                <strong>${section.title}</strong>
                                <small>${section.description}</small>
                            </div>
                        </div>
                    `,
                ).join("")}
            </div>
            <p id="duration-note" class="test-note">
                Cada sección dispone de ${sectionDurationLabel()}.
            </p>
            <div class="start-actions">
                <button id="start">Comenzar evaluación</button>
            </div>
        </main>
    `;

    app.querySelector<HTMLButtonElement>("#start")!
        .addEventListener("click", startTest);
    app.querySelector<HTMLSelectElement>("#section-duration")!
        .addEventListener("change", (event) => {
            const value = Number((event.target as HTMLSelectElement).value);
            if (SECTION_DURATION_OPTIONS.some((option) => option.seconds === value)) {
                sectionDuration = value;
                app.querySelector<HTMLParagraphElement>("#duration-note")!
                    .textContent = `Cada sección dispone de ${sectionDurationLabel()}.`;
            }
        });
}

function renderSectionIntro() {
    const section = currentSection();
    app.innerHTML = `
        <main class="test section-intro">
            <h1>${section.title}</h1>
            <p>${section.description}</p>
            <section class="section-instructions" aria-labelledby="instructions-title">
                <h2 id="instructions-title">Cómo responder</h2>
                <ol>
                    ${section.instructions.map(
                        (instruction) => `<li>${instruction}</li>`,
                    ).join("")}
                </ol>
            </section>
            <p class="test-note">Tienes ${sectionDurationLabel()} para completar esta sección.</p>
            <button id="start-section">
                ${sectionIndex === 0 ? "Comenzar" : "Continuar"}
            </button>
        </main>
    `;

    app.querySelector<HTMLButtonElement>("#start-section")!
        .addEventListener("click", startSection);
}

function renderQuestion() {
    const questions = currentQuestions();
    const question = questions[questionOrder[currentQuestion]];
    const section = currentSection();
    const statementClass = section.id === "perceptual-speed"
        ? "question-statement perceptual-statement"
        : section.id === "number-speed"
            ? "question-statement numeric-statement"
            : "question-statement";

    questionStartTime = performance.now();
    app.innerHTML = `
        <main class="test ${section.id}-test">
            <p id="timer">Tiempo restante: ${formatTime(sectionDuration)}</p>
            <div class="${statementClass}">${question.statement.replace(/\n/g, "<br>")}</div>
            <div class="options">
                ${question.options.map(
                    (option, index) => `
                        <button class="option" data-index="${index}">
                            ${String(option)}
                        </button>
                    `,
                ).join("")}
            </div>
            <button id="next" disabled>
                ${currentQuestion === questions.length - 1
                    ? "Continuar"
                    : "Siguiente pregunta"}
            </button>
        </main>
    `;

    app.querySelectorAll<HTMLButtonElement>(".option").forEach((button) => {
        button.addEventListener("click", () => {
            if (testFinished || answered) return;

            pauseTimer();
            if (remainingTime <= 0) {
                finishSection();
                return;
            }

            const questionIndex = questionOrder[currentQuestion];
            const selected = Number(button.dataset.index);
            const isCorrect = selected === question.answer;
            questionResults.set(
                `${section.id}-${questionIndex}`,
                {
                    id: questionIndex + 1,
                    section: section.title,
                    correct: isCorrect,
                    timeMs: Math.round(performance.now() - questionStartTime),
                },
            );
            answered = true;

            if (isCorrect) {
                score++;
                button.classList.add("correct");
            } else {
                button.classList.add("incorrect");
                app.querySelector(`[data-index="${question.answer}"]`)
                    ?.classList.add("correct");
            }

            app.querySelectorAll<HTMLButtonElement>(".option").forEach(
                (option) => {
                    option.disabled = true;
                },
            );
            app.querySelector<HTMLButtonElement>("#next")!.disabled = false;
        });
    });

    app.querySelector<HTMLButtonElement>("#next")!.addEventListener(
        "click",
        () => {
            if (testFinished || !answered) return;
            if (remainingTime <= 0) {
                finishSection();
                return;
            }

            currentQuestion++;
            if (currentQuestion < questions.length) {
                answered = false;
                renderQuestion();
                resumeTimer();
            } else {
                finishSection();
            }
        },
    );
}

function updateTimer() {
    if (testFinished) return;

    const elapsed = performance.now() - sectionActiveSince;
    const remaining = Math.max(
        0,
        Math.ceil((remainingTime - elapsed) / 1000),
    );
    const timer = app.querySelector<HTMLParagraphElement>("#timer");
    if (timer) {
        timer.textContent =
            `Tiempo restante: ${String(Math.floor(remaining / 60)).padStart(2, "0")}:` +
            `${String(remaining % 60).padStart(2, "0")}`;
    }
    if (remaining === 0) {
        remainingTime = 0;
        finishSection();
    }
}

function pauseTimer() {
    if (timerInterval !== undefined) {
        clearInterval(timerInterval);
        timerInterval = undefined;
    }
    remainingTime = Math.max(
        0,
        remainingTime - (performance.now() - sectionActiveSince),
    );
}

function resumeTimer() {
    sectionActiveSince = performance.now();
    timerInterval = window.setInterval(updateTimer, 250);
    updateTimer();
}

function startTest() {
    sectionIndex = 0;
    sectionScores.length = 0;
    questionResults.clear();
    sectionElapsedTimes.clear();
    testFinished = false;
    renderSectionIntro();
}

function startSection() {
    currentQuestion = 0;
    score = 0;
    answered = false;
    questionOrder = shuffleIndices(currentQuestions().length);
    remainingTime = sectionDuration * 1000;
    renderQuestion();
    resumeTimer();
}

function finishSection() {
    if (timerInterval !== undefined) {
        clearInterval(timerInterval);
        timerInterval = undefined;
    }
    sectionElapsedTimes.set(
        currentSection().id,
        sectionDuration * 1000 - remainingTime,
    );
    sectionScores[sectionIndex] = score;

    if (sectionIndex < sections.length - 1) {
        sectionIndex++;
        renderSectionIntro();
        return;
    }

    finishTest();
}

function finishTest() {
    if (testFinished) return;
    testFinished = true;

    const results = sections.flatMap((section) =>
        section.questions.map((_, index) =>
            questionResults.get(`${section.id}-${index}`) ?? {
                id: index + 1,
                section: section.title,
                correct: false,
                timeMs: null,
            },
        ),
    );

    const stats: SectionStats[] = sections.map((section) => {
        const sectionResults = [...questionResults.values()].filter(
            (result) => result.section === section.title,
        );
        const correctResults = sectionResults.filter(
            (result) => result.correct && result.timeMs !== null,
        );
        const totalCorrectTimeMs = correctResults.reduce(
            (total, result) => total + (result.timeMs ?? 0),
            0,
        );
        const sectionElapsedMs = sectionElapsedTimes.get(section.id) ?? 0;

        return {
            averageCorrectTimeMs: correctResults.length > 0
                ? totalCorrectTimeMs / correctResults.length
                : null,
            correctPerMinute: sectionElapsedMs > 0
                ? correctResults.length / (sectionElapsedMs / 60_000)
                : 0,
            precision: sectionResults.length > 0
                ? correctResults.length / sectionResults.length
                : null,
        };
    });

    app.innerHTML = `
        <main class="test results">
            <p class="eyebrow">Evaluación completada</p>
            <h1>Resultados</h1>

            <section class="result-stats" aria-labelledby="stats-title">
                <div class="stats-heading">
                    <h2 id="stats-title">Rendimiento</h2>
                    <p>Calculado con tus respuestas correctas.</p>
                </div>
                <div class="stats-grid">
                    ${sections.map(
                        (section, index) => {
                            const sectionStats = stats[index];
                            const averageTime = sectionStats.averageCorrectTimeMs === null
                                ? "—"
                                : `${(sectionStats.averageCorrectTimeMs / 1000).toFixed(1)} s`;

                            return `
                                <article class="stats-card">
                                    <h3>${section.title}</h3>
                                    <div class="stat">
                                        <span>Tiempo promedio por correcta</span>
                                        <strong>${averageTime}</strong>
                                    </div>
                                    <div class="stat">
                                        <span>Correctas por minuto</span>
                                        <strong>${sectionStats.correctPerMinute.toFixed(1)}</strong>
                                    </div>
                                    <div class="stat">
                                        <span>Precisión</span>
                                        <strong>${
                                            sectionStats.precision === null
                                                ? "—"
                                                : `${(sectionStats.precision * 100).toFixed(0)}%`
                                        }</strong>
                                    </div>
                                </article>
                            `;
                        },
                    ).join("")}
                </div>
            </section>

            <button id="download-results">Descargar resultados</button>
            <button id="restart">Volver a empezar</button>
        </main>
    `;

    app.querySelector<HTMLButtonElement>("#download-results")!
        .addEventListener("click", () => downloadResults(results));
    app.querySelector<HTMLButtonElement>("#restart")!
        .addEventListener("click", renderStartScreen);
}

function downloadResults(results: QuestionResult[]) {
    const file = new Blob(
        [JSON.stringify(results, null, 2)],
        { type: "application/json" },
    );
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = "resultados-test-aptitud.json";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

renderStartScreen();
