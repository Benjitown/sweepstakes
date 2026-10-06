// Sweepstakes, terminal edition (Kotlin). Minesweeper, but you're gambling.
//
//   kotlinc src -include-runtime -d sweepstakes.jar     build (Kotlin 1.9+, any JDK 11+)
//   java -jar sweepstakes.jar                            play
//   java -jar sweepstakes.jar --plain                    no colours
//   java -jar sweepstakes.jar --selftest                 check the Daily Challenge matches the web game exactly
//   java -jar sweepstakes.jar --seed 7 --save FILE       repeatable luck / another save file
//
// The rules and jokes are in Rules.kt, generated from the web game by tools/export_rules.mjs.
package sweepstakes

import java.io.FileDescriptor
import java.io.FileOutputStream
import java.io.PrintStream
import kotlin.random.Random
import kotlin.system.exitProcess

fun selftest(): Int {
    var ok = true
    for (g in Rules.GOLDEN_BOARDS) {
        val b = Daily.create(g.key)
        val gems = (0 until b.n).filter { b.gem[it] != 0.0 }.map { it to b.gem[it] }
        val same = b.mine.joinToString("") == g.mines && b.open.joinToString("") == g.open && gems == g.gems &&
            Daily.friends(g.key) == g.friends && Daily.number(g.key) == g.number
        ok = ok && same
        println("${if (same) "PASS" else "FAIL"} daily board ${g.key} #${g.number}")
    }
    for (r in Rules.GOLDEN_RUNS) {
        val b = Daily.create(r.key)
        var why: String? = null
        for (step in 0 until 12) {
            if (b.over) break
            val d = Solver.solve(b)
            var pick = (0 until b.n).firstOrNull { b.open[it] == 0 && b.flag[it] == 0 && d.ks[it] == 1 } ?: -1
            if (pick < 0) {
                var best = 2.0
                for (i in 0 until b.n) {
                    if (b.open[i] == 1 || b.flag[i] == 1 || d.p[i] >= 1) continue
                    if (d.p[i] < best) { best = d.p[i].toDouble(); pick = i }
                }
            }
            if (pick < 0) break
            why = Daily.dig(b, pick).why
        }
        val end = why ?: "cash"
        val mult = if (end == "boom") 0.0 else b.mult()
        val same = b.moves == r.moves && b.revealed == r.revealed && end == r.why && mult == r.mult
        ok = ok && same
        println("${if (same) "PASS" else "FAIL"} golden run ${r.key}: $end x$mult after ${b.moves.size} digs" + (if (same) "" else " (web: ${r.why} x${r.mult})"))
    }
    println(if (ok) "all good: this version plays the exact same daily as the web game" else "MISMATCH with the web game")
    return if (ok) 0 else 1
}

fun main(args: Array<String>) {
    System.setOut(PrintStream(FileOutputStream(FileDescriptor.out), true, "UTF-8"))
    if ("--plain" in args || System.getenv("NO_COLOR") != null || System.console() == null) Term.color = false
    args.indexOf("--seed").takeIf { it >= 0 && it + 1 < args.size }?.let { Game.rnd = Random(args[it + 1].toLong()) }
    args.indexOf("--save").takeIf { it >= 0 && it + 1 < args.size }?.let { Save.path = args[it + 1] }
    if ("--selftest" in args) exitProcess(selftest())
    try {
        Game(Save()).run()
    } catch (e: QuitGame) {
        // end of input: nothing to do, the game saves as it goes
    }
}
