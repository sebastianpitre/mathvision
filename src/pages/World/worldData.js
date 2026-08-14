const worlds = [
    {
        id: "algebra",
        title: "Algebra Core",
        subtitle: "Domina las ecuaciones",
        icon: "🔢",
        color: "cyan",
        game: "Escape Algebra",
        route: "/games/escape-algebra",
        requiredXP: 0,
        requiredWorld: null,
        description:
            "Resuelve ecuaciones y desbloquea las cámaras del núcleo algebraico."
    },

    {
        id: "geometry",
        title: "Geometry Lab",
        subtitle: "Explora el espacio",
        icon: "📐",
        color: "purple",
        game: "Geometry Lab",
        route: "/games/geometry-lab",
        requiredXP: 500,
        requiredWorld: "algebra",
        description:
            "Explora figuras, áreas, perímetros y dimensiones en un laboratorio virtual."
    },

    {
        id: "functions",
        title: "Function Runner",
        subtitle: "Controla las funciones",
        icon: "📊",
        color: "blue",
        game: "Function Runner",
        route: "/games/function-runner",
        requiredXP: 1000,
        requiredWorld: "geometry",
        description:
            "Comprende las funciones matemáticas mientras superas diferentes desafíos."
    },

    {
        id: "final",
        title: "MathVision Core",
        subtitle: "El desafío final",
        icon: "🌌",
        color: "yellow",
        game: "MathVision Core",
        route: "/games/mathvision-core",
        requiredXP: 2000,
        requiredWorld: "functions",
        description:
            "El desafío definitivo donde tendrás que utilizar todo lo aprendido."
    }
];

export default worlds;