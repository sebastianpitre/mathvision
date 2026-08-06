import { FaSearch, FaBell } from "react-icons/fa";

export default function Topbar(){

    return(

        <header className="h-20 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-8">

            <div>

                <h2 className="text-2xl font-bold">

                    Dashboard

                </h2>

            </div>

            <div className="flex items-center gap-6">

                <div className="relative">

                    <FaSearch className="absolute left-4 top-4"/>

                    <input

                        className="bg-slate-800 rounded-full pl-12 pr-4 py-3 outline-none"

                        placeholder="Buscar..."

                    />

                </div>

                <FaBell size={22}/>

                <img

                    src="https://i.pravatar.cc/50"

                    className="rounded-full"

                />

            </div>

        </header>

    )

}