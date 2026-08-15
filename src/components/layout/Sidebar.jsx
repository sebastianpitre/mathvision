import {
    FaHome,
    FaUserGraduate,
    FaRegHeart,
    FaTrophy,
    FaChartLine
} from "react-icons/fa";

import { NavLink } from "react-router-dom";

const menuItems = [
    {
        name: "Dashboard",
        path: "/dashboard",
        icon: FaHome
    },
    {
        name: "Mundos",
        path: "/world",
        icon: FaRegHeart
    },
    {
        name: "Progreso",
        path: "/progress",
        icon: FaChartLine
    },
    {
        name: "Logros",
        path: "/achievements",
        icon: FaTrophy
    },
    {
        name: "Perfil",
        path: "/profile",
        icon: FaUserGraduate
    }
];

export default function Sidebar() {

    return (

        <aside
            className="
                sticky
                top-0
                hidden
                h-screen
                w-55
                shrink-0
                overflow-y-auto
                border-r
                border-slate-800
                bg-slate-950/90
                backdrop-blur-xl
                lg:block
            "
        >

            {/* LOGO */}

            <div className="flex h-20 items-center border-b border-slate-800 px-6">

                <div>

                    <h1 className="text-2xl font-black tracking-tight">

                        Math

                        <span className="text-cyan-400">
                            Vision
                        </span>

                    </h1>

                    <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
                        Learning Universe
                    </p>

                </div>

            </div>


            {/* MENU */}

            <nav className="px-4 py-6">

                <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-widest text-slate-500">

                    Navegación

                </p>


                <div className="space-y-2">

                    {menuItems.map((item) => {

                        const Icon = item.icon;

                        return (

                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) =>
                                    `
                                    flex
                                    items-center
                                    gap-4
                                    rounded-xl
                                    px-4
                                    py-3
                                    transition-all
                                    duration-300

                                    ${
                                        isActive
                                            ? "bg-cyan-500/10 text-cyan-400 shadow-[inset_3px_0_0_#22d3ee]"
                                            : "text-slate-400 hover:bg-slate-900 hover:text-white"
                                    }
                                    `
                                }
                            >

                                <Icon className="shrink-0" />

                                <span className="font-medium">
                                    {item.name}
                                </span>

                            </NavLink>

                        );

                    })}

                </div>

            </nav>


            {/* BOTTOM CARD */}

            <div className="mx-4 mt-10 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">

                <p className="text-sm font-bold text-cyan-400">

                    🚀 Próximamente

                </p>

                <p className="mt-2 text-xs leading-5 text-slate-400">

                    Nuevas experiencias de realidad virtual.

                </p>

            </div>

        </aside>

    );

}