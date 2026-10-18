import type { Lesson } from "./course";
export const dialogues: Lesson[] = [
  {
    id: "dialogue-intro",
    level: "A0",
    title: "Знакомство в Бухаресте",
    subtitle: "Диалог · знакомство",
    minutes: 6,
    rule: "Ана и Андрей знакомятся. Cum te numești? — вопрос на ты. После представления естественно сказать Îmi pare bine! Сначала прослушайте реплики, затем выберите подходящие выражения.",
    tip: "Mă numesc и Sunt… — два способа представиться. В этой практике отвечайте формулировкой из диалога.",
    pairs: [
      {
        ro: "Bună! Eu sunt Ana. Tu cum te numești?",
        ru: "Привет! Я Ана. А тебя как зовут?",
        note: "Ана",
      },
      {
        ro: "Mă numesc Andrei. Îmi pare bine!",
        ru: "Меня зовут Андрей. Приятно познакомиться!",
        note: "Андрей",
      },
      { ro: "Și mie. De unde ești?", ru: "Мне тоже. Откуда ты?", note: "Ана" },
      {
        ro: "Sunt din Rusia, dar acum locuiesc în București.",
        ru: "Я из России, но сейчас живу в Бухаресте.",
        note: "Андрей",
      },
      {
        ro: "Bine ai venit în România!",
        ru: "Добро пожаловать в Румынию!",
        note: "Ана",
      },
    ],
  },
  {
    id: "dialogue-cafe",
    level: "A1",
    title: "Заказ в кафе",
    subtitle: "Диалог · еда и вежливость",
    minutes: 7,
    rule: "Посетитель заказывает кофе. Cu lapte — с молоком, fără zahăr — без сахара. Для вежливого заказа используем готовую форму Aș dori… — я хотел(а) бы. Следите за тем, кто задаёт вопрос и кто отвечает.",
    tip: "В просьбе «пожалуйста» — vă rog. На благодарность отвечают cu plăcere.",
    pairs: [
      {
        ro: "Bună ziua! Ce doriți?",
        ru: "Добрый день! Что желаете?",
        note: "Официант",
      },
      {
        ro: "Aș dori o cafea cu lapte, vă rog.",
        ru: "Я хотел(а) бы кофе с молоком, пожалуйста.",
        note: "Посетитель",
      },
      {
        ro: "Doriți și ceva de mâncare?",
        ru: "Хотите также что-нибудь поесть?",
        note: "Официант",
      },
      {
        ro: "Da, un sandviș cu brânză, vă rog.",
        ru: "Да, бутерброд с сыром, пожалуйста.",
        note: "Посетитель",
      },
      {
        ro: "Sigur. Vă aduc imediat comanda.",
        ru: "Конечно. Сейчас принесу ваш заказ.",
        note: "Официант",
      },
      {
        ro: "Mulțumesc! Pot plăti cu cardul?",
        ru: "Спасибо! Можно оплатить картой?",
        note: "Посетитель",
      },
    ],
  },
  {
    id: "dialogue-train",
    level: "A2",
    title: "Покупка билета на поезд",
    subtitle: "Диалог · поездка",
    minutes: 8,
    rule: "Покупаем билет до Брашова. Dus — в одну сторону, dus-întors — туда и обратно. La clasa a doua — во втором классе. Диалог учит бытовому общению пассажира и не содержит эксплуатационных команд.",
    tip: "Для направления используйте până la: un bilet până la Brașov. Указанное время — пример языкового диалога, не расписание.",
    pairs: [
      {
        ro: "Bună ziua! Aș dori un bilet până la Brașov.",
        ru: "Добрый день! Я хотел(а) бы билет до Брашова.",
        note: "Пассажир",
      },
      {
        ro: "Doar dus sau dus-întors?",
        ru: "В одну сторону или туда и обратно?",
        note: "Кассир",
      },
      {
        ro: "Doar dus, la clasa a doua.",
        ru: "В одну сторону, во втором классе.",
        note: "Пассажир",
      },
      {
        ro: "La ce oră doriți să plecați?",
        ru: "В котором часу вы хотите отправиться?",
        note: "Кассир",
      },
      {
        ro: "Aș prefera să plec dimineața.",
        ru: "Я предпочёл(предпочла) бы отправиться утром.",
        note: "Пассажир",
      },
      {
        ro: "Vă rog să verificați ora de plecare pe bilet.",
        ru: "Пожалуйста, проверьте время отправления в билете.",
        note: "Кассир",
      },
    ],
  },
  {
    id: "dialogue-work",
    level: "B1",
    title: "Обсуждаем рабочую задачу",
    subtitle: "Диалог · работа",
    minutes: 8,
    rule: "Коллеги уточняют задачу и срок. A clarifica — прояснять. До согласования сроков вежливо задавайте уточняющие вопросы. Это вводная лексическая практика B1, а не полный учебный модуль этого уровня.",
    tip: "Îmi puteți spune…? — вежливое «Вы можете мне сказать…?». Форму множественного числа используем и при обращении к одному человеку на вы.",
    pairs: [
      {
        ro: "Îmi puteți spune ce trebuie să pregătesc?",
        ru: "Вы можете сказать мне, что нужно подготовить?",
        note: "Сотрудник",
      },
      {
        ro: "Avem nevoie de un raport despre proiect.",
        ru: "Нам нужен отчёт о проекте.",
        note: "Руководитель",
      },
      {
        ro: "Care este termenul de predare?",
        ru: "Какой срок сдачи?",
        note: "Сотрудник",
      },
      {
        ro: "Raportul trebuie să fie gata până vineri.",
        ru: "Отчёт должен быть готов к пятнице.",
        note: "Руководитель",
      },
      {
        ro: "Aș vrea să clarific câteva detalii înainte să încep.",
        ru: "Я хотел(а) бы уточнить несколько деталей перед началом.",
        note: "Сотрудник",
      },
      {
        ro: "Sigur, putem discuta acum.",
        ru: "Конечно, можем обсудить сейчас.",
        note: "Руководитель",
      },
    ],
  },
];
export const dialogueAudio = (lesson: Lesson) =>
  lesson.pairs.map((p) => p.ro).join(" ");
