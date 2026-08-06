export default function StatCard({

    title,

    value

}) {

    return (

        <div className="bg-slate-900 rounded-3xl p-6 border border-slate-700">

            <p className="text-slate-400">

                {title}

            </p>

            <h2 className="text-4xl font-bold mt-4">

                {value}

            </h2>

        </div>

    )

}