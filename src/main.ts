import "./style.css";
import questionsData from "./data/questions.json";

type Question = {
    statement: string;
    options: string[];
    answer: number;
};

const questions: Question[] = questionsData;

// Validar las preguntas antes de iniciar el test
for (const [index, question] of questions.entries()) {
    if (
        !Array.isArray(question.options) ||
        question.options.length === 0 ||
        !Number.isInteger(question.answer) ||
        question.answer < 0 ||
        question.answer >= question.options.length
    ) {
        throw new Error(
            `Pregunta ${index + 1}: índice de respuesta inválido. ` +
            `Los índices permitidos son de 0 a ${question.options.length - 1}.`,
        );
    }
}

if (questions.length === 0) {
    throw new Error("El test debe contener al menos una pregunta.");
}

const TEST_DURATION = 30;
const responseTimes: number[] = [];
let answered = false;
let currentQuestion = 0;
let questionActiveSince = 0;
let questionOrder: number [] = [];
let questionStartTime = 0;
let remainingTime = 0;
let score = 0;
let testFinished = false;
let timerInterval: number | undefined;

const app = document.querySelector<HTMLDivElement>("#app")!;

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
            <h1>Test de aptitud</h1>
            <p>Dispones de 2 minutos para responder las preguntas.</p>
            <button id="start">Ok</button>
        </main>
    `;

    app.querySelector<HTMLButtonElement>("#start")!
        .addEventListener("click", startTest);
}

function renderQuestionLoop() {
    const questionIndex = questionOrder[currentQuestion];
    const question = questions[questionIndex];

    questionStartTime = performance.now();
    app.innerHTML = `
        <main class="test">
            <p class="progress">
                Pregunta ${currentQuestion + 1} de ${questions.length}
            </p>
            <p id="timer">Tiempo restante: 02:00</p>
            <h1>${question.statement}</h1>
            <div class="options">
                ${question.options.map(
                    (option, index) => `
                        <button class="option" data-index="${index}">
                            ${option}
                        </button>
                    `,
                ).join("")}
            </div>
            <button id="next" disabled>
                ${currentQuestion === questions.length - 1
                    ? "Ver resultado"
                    : "Siguiente pregunta"}
            </button>
        </main>
    `;

    app.querySelectorAll<HTMLButtonElement>(".option").forEach((button) => {
        button.addEventListener("click", () => {
            if (testFinished || answered) return;

            pauseTimer();

            if (remainingTime <= 0) {
                finishTest();
                return;
            }

            const elapsed = performance.now() - questionStartTime;
            responseTimes[questionIndex] = elapsed;

            answered = true;

            const selected = Number(button.dataset.index);

            if (selected === question.answer) {
                score++;
                button.classList.add("correct");
            } else {
                button.classList.add("incorrect");
                app
                    .querySelector(`[data-index="${question.answer}"]`)
                    ?.classList.add("correct");
            }

            app.querySelectorAll<HTMLButtonElement>(".option").forEach((option) => {
                option.disabled = true;
            });

            app.querySelector<HTMLButtonElement>("#next")!.disabled = false;
        });
    });

    app.querySelector<HTMLButtonElement>("#next")!.addEventListener(
        "click",
        () => {
            if (testFinished || !answered) return;

            if (remainingTime <= 0) {
                finishTest();
                return;
            }

            currentQuestion++;

            if (currentQuestion < questions.length) {
                answered = false;
                renderQuestionLoop();
                resumeTimer();
                updateTimer();
            } else {
                finishTest();
            }
        },
    );
}

function updateTimer() {
    if (testFinished) return;
    const elapsed = performance.now() - questionActiveSince;
    const remaining = Math.max(
        0,
        Math.ceil((remainingTime  - elapsed) / 1000),
    );
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    const timer = app.querySelector<HTMLParagraphElement>("#timer");
    if (timer) {
        timer.textContent =
            `Tiempo restante: ${String(minutes).padStart(2, "0")}:` +
            `${String(seconds).padStart(2, "0")}`;
    }
    if (remaining === 0) {
        finishTest();
    }
}

function pauseTimer() {
    if (timerInterval !== undefined) {
        clearInterval(timerInterval);
        timerInterval = undefined;
    }
    remainingTime -= performance.now() - questionActiveSince;
    remainingTime = Math.max(0, remainingTime);
}

function resumeTimer() {
    questionActiveSince = performance.now();
    timerInterval = window.setInterval(updateTimer, 250);
    updateTimer();
}

function finishTest() {
    if (testFinished) return;

    testFinished = true;

    if (timerInterval !== undefined) {
        clearInterval(timerInterval);
        timerInterval = undefined;
    }

    const answeredCount = responseTimes.filter(
        (time) => time !== undefined,
    ).length;

    app.innerHTML = `
        <main class="test">
            <h1>Test finalizado</h1>

            <p>Respuestas correctas: ${score}</p>
            <p>Preguntas respondidas: ${answeredCount} de ${questions.length}</p>
            <p>Preguntas sin responder: ${questions.length - answeredCount}</p>

            <h2>Tiempo por pregunta</h2>

            <ul>
                ${responseTimes
                    .map(
                        (time, index) => `
                            <li>
                                Pregunta ${index + 1}: ${(time / 1000).toFixed(2)} s
                            </li>
                        `,
                    )
                    .join("")}
            </ul>

            <button id="restart">Volver a empezar</button>
        </main>
    `;

    app.querySelector<HTMLButtonElement>("#restart")!.addEventListener(
        "click",
        renderStartScreen
    );
}

function startTest() {
    if (timerInterval !== undefined) {
        clearInterval(timerInterval);
        timerInterval = undefined;
    }

    answered = false;
    currentQuestion = 0;
    questionOrder = shuffleIndices(questions.length);
    remainingTime = TEST_DURATION * 1000;
    responseTimes.length = 0;
    score = 0;
    testFinished = false;

    renderQuestionLoop();
    updateTimer();

    timerInterval = window.setInterval(updateTimer, 250);

}

renderStartScreen();
