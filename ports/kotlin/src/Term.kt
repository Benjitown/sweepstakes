// The terminal: colours, input, number formatting, the group chat and drawing a board.
package sweepstakes

import java.util.Locale
import kotlin.math.floor
import kotlin.math.log10
import kotlin.math.pow
import kotlin.math.roundToLong

object Term {
    var color = true
    private val codes = mapOf("red" to 31, "green" to 32, "gold" to 33, "blue" to 34, "purple" to 35, "cyan" to 36, "dim" to 90, "bold" to 1, "orange" to 91)
    val friendColor = mapOf("dave" to "blue", "tash" to "red", "kev" to "green", "nan" to "purple", "priya" to "gold")
    val numColor = mapOf(1 to "blue", 2 to "green", 3 to "red", 4 to "purple", 5 to "orange", 6 to "cyan", 7 to "gold", 8 to "bold")

    fun c(text: Any, name: String?): String = if (color && name != null) "\u001b[${codes[name]}m$text\u001b[0m" else text.toString()

    /** Reads a line; end of input quits the game cleanly. */
    fun ask(prompt: String = "> "): String {
        print(prompt); System.out.flush()
        val line = readLine() ?: throw QuitGame()
        return line.trim()
    }
}

class QuitGame : RuntimeException()

fun c(text: Any, name: String?) = Term.c(text, name)

fun fmt(v: Double): String {
    val n = floor(v).toLong(); val a = kotlin.math.abs(n).toDouble()
    if (a < 10000) return String.format(Locale.UK, "%,d", n)
    for ((value, suffix) in listOf(1e18 to "Qi", 1e15 to "Qa", 1e12 to "T", 1e9 to "B", 1e6 to "M", 1e3 to "K")) {
        if (a >= value) {
            val digits = if (a / value < 100) 2 else 1
            return String.format(Locale.ROOT, "%.${digits}f", n / value).trimEnd('0').trimEnd('.') + suffix
        }
    }
    return n.toString()
}
fun fmt(n: Long) = fmt(n.toDouble())
fun fmt(n: Int) = fmt(n.toDouble())

fun fmtX(x: Double): String = when {
    x >= 100 -> fmt(x)
    x >= 10 -> String.format(Locale.ROOT, "%.1f", x)
    else -> String.format(Locale.ROOT, "%.2f", x)
}

fun fmtLim(x: Double): String = if (x == floor(x)) fmt(x) else fmtX(x)

fun nice(v: Double): Double {
    if (v < 100) return v.roundToLong().toDouble()
    val p = 10.0.pow(floor(log10(v)) - 1)
    return (v / p).roundToLong() * p
}

/** Someone in the group chat reacts. */
fun say(event: String, chance: Double = .6, vars: Map<String, String> = emptyMap()) {
    val pool = Rules.LINES[event] ?: return
    if (Game.rnd.nextDouble() > chance) return
    val (who, line) = pool[Game.rnd.nextInt(pool.size)]
    var text = line
    for ((k, v) in vars) text = text.replace("{$k}", v)
    println("  ${c(Rules.FRIENDS.getValue(who), Term.friendColor[who] ?: "bold")}: $text")
}

fun quip(chance: Double) {
    if (Game.rnd.nextDouble() < chance) println(c("  * ${Rules.QUIPS[Game.rnd.nextInt(Rules.QUIPS.size)]} *", "purple"))
}

fun coord(i: Int, w: Int) = "${'A' + i % w}${i / w + 1}"

fun parseCoord(raw: String, b: Board): Int? {
    val s = raw.trim().uppercase()
    if (s.length < 2 || !s[0].isLetter() || !s.substring(1).all { it.isDigit() }) return null
    val x = s[0] - 'A'; val y = s.substring(1).toInt() - 1
    return if (x in 0 until b.w && y in 0 until b.h) y * b.w + x else null
}

fun draw(b: Board, reveal: Boolean = false, oddsOn: Boolean = false) {
    val p = if (oddsOn && b.started && !b.over) Solver.solve(b).p else null
    println("     " + (0 until b.w).joinToString(" ") { ('A' + it).toString() })
    println("   +" + "-".repeat(b.w * 2 + 1) + "+")
    for (y in 0 until b.h) {
        val row = (0 until b.w).map { x ->
            val i = y * b.w + x
            when {
                b.open[i] == 1 -> when {
                    b.gem[i] != 0.0 && b.num[i] == 0 -> c("$", "gold")
                    b.num[i] > 0 -> c(b.num[i], Term.numColor[b.num[i]])
                    else -> c(".", "dim")
                }
                b.flag[i] == 1 -> c("F", "red")
                reveal && b.mine[i] == 1 -> c("*", "red")
                reveal && b.gem[i] != 0.0 -> c("$", "gold")
                p != null -> c(minOf(9, (p[i] * 10).toInt()), if (p[i] < .2) "green" else if (p[i] < .35) "gold" else "red")
                else -> "#"
            }
        }
        println(String.format(Locale.ROOT, "%2d | ", y + 1) + row.joinToString(" ") + " |")
    }
    println("   +" + "-".repeat(b.w * 2 + 1) + "+")
}
