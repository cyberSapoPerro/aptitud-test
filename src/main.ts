import "./style.css";
import questionsData from "./data/questions.json";

type Question = {
    statement: string;
    options: string[];
    answer: number;
};

const questions: Question[] = questionsData;

// Validar las preguntas antes de iniciar el test.
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


let currentQuestion = 0;
let score = 0;
let answered = false;
let questionStartTime = 0;
const responseTimes: number[] = [];
const TEST_DURATION = 30;
let timerInterval: number | undefined;
let deadline = 0;
let testFinished = false;
let questionOrder: number [] = [];

const app = document.querySelector<HTMLDivElement>("#app")!;

function shuffleIndices(length: number): number[] {
    const indices = Array.from({ length }, (_, index) => index);
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
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

            if (performance.now() >= deadline) {
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

            if (performance.now() >= deadline) {
                finishTest();
                return;
            }

            currentQuestion++;

            if (currentQuestion < questions.length) {
                answered = false;
                renderQuestionLoop();
                updateTimer();
            } else {
                finishTest();
            }
        },
    );
}

function updateTimer() {
    if (testFinished) return;

    const remaining = Math.max(
        0,
        Math.ceil((deadline - performance.now()) / 1000),
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
        startTest,
    );
}

function startTest() {
    if (timerInterval !== undefined) {
        clearInterval(timerInterval);
        timerInterval = undefined;
    }

    currentQuestion = 0;
    score = 0;
    answered = false;
    responseTimes.length = 0;
    testFinished = false;
    questionOrder = shuffleIndices(questions.length);

    deadline = performance.now() + TEST_DURATION * 1000;

    renderQuestionLoop();
    updateTimer();

    timerInterval = window.setInterval(updateTimer, 250);

}

startTest();
