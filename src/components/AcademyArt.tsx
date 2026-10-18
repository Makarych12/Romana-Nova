export default function AcademyArt() {
  return (
    <div className="academy-art" aria-hidden="true">
      <svg viewBox="0 0 600 440">
        <defs>
          <linearGradient id="land" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#37ddff" stopOpacity=".25" />
            <stop offset="1" stopColor="#2563eb" stopOpacity=".04" />
          </linearGradient>
          <linearGradient id="orbit">
            <stop stopColor="#11ddff" stopOpacity="0" />
            <stop offset=".5" stopColor="#12dfff" />
            <stop offset="1" stopColor="#386aff" stopOpacity=".2" />
          </linearGradient>
          <radialGradient id="glow">
            <stop stopColor="#168dff" stopOpacity=".4" />
            <stop offset="1" stopColor="#0a2050" stopOpacity="0" />
          </radialGradient>
          <filter id="blur">
            <feGaussianBlur stdDeviation="5" />
          </filter>
          <pattern
            id="grid"
            width="28"
            height="28"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 28 0 L 0 0 0 28"
              fill="none"
              stroke="#60c8ff"
              strokeWidth=".4"
              opacity=".25"
            />
          </pattern>
        </defs>
        <circle cx="310" cy="235" r="230" fill="url(#glow)" />
        <ellipse
          cx="308"
          cy="325"
          rx="220"
          ry="45"
          fill="none"
          stroke="#1875e5"
          strokeWidth="1"
          opacity=".3"
        />
        <ellipse
          cx="308"
          cy="325"
          rx="172"
          ry="31"
          fill="none"
          stroke="#1b82ed"
          opacity=".3"
        />
        <path
          d="M95 320 305 180 530 320 305 400Z"
          fill="url(#grid)"
          opacity=".6"
        />
        <g className="orbit-ring">
          <ellipse
            cx="310"
            cy="220"
            rx="195"
            ry="155"
            fill="none"
            stroke="url(#orbit)"
            strokeWidth="1.5"
            transform="rotate(-24 310 220)"
          />
          <ellipse
            cx="310"
            cy="220"
            rx="197"
            ry="157"
            fill="none"
            stroke="#287bff"
            opacity=".2"
            transform="rotate(-24 310 220)"
          />
        </g>
        <circle
          cx="310"
          cy="220"
          r="131"
          fill="none"
          stroke="#38c9ff"
          strokeDasharray="2 9"
          opacity=".4"
        />
        <path
          d="m191 157 32-18 15-26 35 8 30-20 27 12 19-4 19 29 31 6 20 28 36 11 11 25-21 27 14 21-21 21-29-6-26 12-32-9-22 13-29-5-27 15-23-13-28 7-15-24-27-4-16-27 15-22-8-26 19-21Z"
          transform="translate(0 22)"
          fill="#1686ff"
          opacity=".2"
          filter="url(#blur)"
        />
        <path
          d="m191 157 32-18 15-26 35 8 30-20 27 12 19-4 19 29 31 6 20 28 36 11 11 25-21 27 14 21-21 21-29-6-26 12-32-9-22 13-29-5-27 15-23-13-28 7-15-24-27-4-16-27 15-22-8-26 19-21Z"
          fill="url(#land)"
          stroke="#4cb8ff"
          strokeWidth="1.4"
        />
        <path
          d="m240 146 30 30 40 8 28 38 19 26 40 9M234 248l40-24 19-41"
          fill="none"
          stroke="#44bfff"
          strokeDasharray="3 5"
          opacity=".4"
        />
        <circle cx="354" cy="249" r="20" fill="#00dfff" opacity=".1" />
        <circle cx="354" cy="249" r="9" fill="#00dfff" opacity=".2" />
        <circle cx="354" cy="249" r="3.5" fill="#9cf8ff" />
        <text
          x="370"
          y="254"
          fill="#d2efff"
          fontFamily="sans-serif"
          fontSize="11"
          letterSpacing="1"
        >
          BUCUREȘTI
        </text>
        <circle cx="260" cy="169" r="3" fill="#a3f8ff" />
        <text
          x="276"
          y="173"
          fill="#82abd4"
          fontFamily="sans-serif"
          fontSize="9"
        >
          CLUJ-NAPOCA
        </text>
        <g transform="translate(112 260)">
          <rect
            width="110"
            height="43"
            rx="10"
            fill="#102b50"
            stroke="#3d6995"
            strokeOpacity=".6"
          />
          <text
            x="13"
            y="17"
            fontFamily="sans-serif"
            fontSize="9"
            fill="#6e9dc5"
          >
            НОВЫЕ ВОЗМОЖНОСТИ
          </text>
          <text
            x="13"
            y="32"
            fontFamily="sans-serif"
            fontSize="11"
            fill="#d2f7ff"
          >
            Bună, România!
          </text>
        </g>
        <g transform="translate(388 90)">
          <rect width="88" height="34" rx="8" fill="#123360" stroke="#3266a0" />
          <circle cx="17" cy="17" r="4" fill="#00e4ba" />
          <text
            x="29"
            y="21"
            fontFamily="sans-serif"
            fontSize="10"
            fill="#d3ecff"
          >
            A0 → C1
          </text>
        </g>
        <path
          d="M150 112h8m-4-4v8M467 286h8m-4-4v8M418 344h6m-3-3v6"
          stroke="#45b8ee"
          opacity=".6"
        />
        <circle cx="175" cy="81" r="2" fill="#5b86de" />
        <circle cx="480" cy="175" r="2" fill="#a9d9ff" />
        <circle cx="100" cy="218" r="2" fill="#a9d9ff" />
      </svg>
      <div className="art-caption">
        <span /> ВАШЕ ПУТЕШЕСТВИЕ НАЧИНАЕТСЯ ЗДЕСЬ
      </div>
    </div>
  );
}
