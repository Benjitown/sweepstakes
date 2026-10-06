// The rules engine: seeded randomness, the board, the solver and the Daily Challenge.
// Same rules as the web game (src/board, src/game/daily.js), so the daily board and its scores match exactly.
package sweepstakes

import java.time.LocalDate
import java.time.temporal.ChronoUnit
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min

// ===================================================================== seeded randomness (src/core/random.js)
/** mulberry32: floats in [0, 1), bit-for-bit the same sequence as the web game. Int arithmetic wraps like Math.imul. */
fun seeded(seed: Int): () -> Double {
    var a = seed
    return {
        a += 0x6D2B79F5
        var t = a
        t = (t xor (t ushr 15)) * (t or 1)
        t = t xor (t + (t xor (t ushr 7)) * (t or 61))
        ((t xor (t ushr 14)).toLong() and 0xFFFFFFFFL) / 4294967296.0
    }
}

/** FNV-1a, 32-bit. */
fun hashString(s: String): Int {
    var h = 0x811c9dc5L.toInt()
    for (ch in s) h = (h xor ch.code) * 0x01000193
    return h
}

fun rollGem(rng: () -> Double): GemTier {
    var r = rng()
    for (g in Rules.GEMS) { r -= g.w; if (r <= 0) return g }
    return Rules.GEMS[0]
}

fun gemTier(x: Double): GemTier = Rules.GEMS.firstOrNull { kotlin.math.abs(it.x - x) < 1e-6 } ?: Rules.GEMS[0]

/** JavaScript's Math.round(x * 100) / 100: halves round up. */
fun round2(x: Double): Double = floor(x * 100 + 0.5) / 100

// ===================================================================== the board (src/board/board.js)
private val nbCache = HashMap<Int, List<IntArray>>()

fun neighbours(w: Int, h: Int): List<IntArray> = nbCache.getOrPut(w * 1000 + h) {
    List(w * h) { i ->
        val x = i % w; val y = i / w; val a = ArrayList<Int>()
        for (dy in -1..1) for (dx in -1..1) {
            if (dx == 0 && dy == 0) continue
            val nx = x + dx; val ny = y + dy
            if (nx in 0 until w && ny in 0 until h) a.add(ny * w + nx)
        }
        a.toIntArray()
    }
}

class Board(val t: Table, val stake: Long, val m: Int, val lim: Double, val rng: () -> Double = { Game.rnd.nextDouble() }) {
    val w = t.w; val h = t.h; val n = w * h
    val nb = neighbours(w, h)
    val mine = IntArray(n); val open = IntArray(n); val flag = IntArray(n); val num = IntArray(n); val gem = DoubleArray(n)
    var started = false; var over = false
    var revealed = 0; var base = 0; val safe = n - m
    var G = 1.0; var J = 1.0
    var golden = false; var guesses = 0; var combo = 0
    var gemsTotal = t.gems; var gemsFound = 0
    val moves = ArrayList<String>()
    var ded: Solved? = null

    fun calcNums() { for (i in 0 until n) num[i] = nb[i].sumOf { mine[it] } }

    private fun shuffle(pool: MutableList<Int>) {
        for (k in pool.size - 1 downTo 1) {
            val j = floor(rng() * (k + 1)).toInt()
            val tmp = pool[k]; pool[k] = pool[j]; pool[j] = tmp
        }
    }

    fun placeMines(first: Int) {
        val ban = HashSet<Int>().apply { add(first); nb[first].forEach { add(it) } }
        var pool = (0 until n).filter { it !in ban }.toMutableList()
        if (pool.size < m) pool = (0 until n).filter { it != first }.toMutableList()
        shuffle(pool)
        for (k in 0 until m) mine[pool[k]] = 1
        calcNums()
    }

    fun placeGems(count: Int) {
        val pool = (0 until n).filter { open[it] == 0 && mine[it] == 0 }.toMutableList()
        shuffle(pool)
        gemsTotal = min(count, pool.size)
        for (k in 0 until gemsTotal) gem[pool[k]] = rollGem(rng).x
    }

    fun flood(i: Int): List<Int> {
        val stack = ArrayDeque<Int>().apply { addLast(i) }; val out = ArrayList<Int>()
        while (stack.isNotEmpty()) {
            val k = stack.removeLast()
            if (open[k] == 1 || flag[k] == 1 || mine[k] == 1) continue
            open[k] = 1; revealed++; out.add(k)
            if (num[k] == 0) for (j in nb[k]) if (open[j] == 0 && flag[j] == 0) stack.addLast(j)
        }
        return out
    }

    fun hiddenGems() = (0 until n).count { gem[it] != 0.0 && open[it] == 0 }
    fun frac(): Double { if (!started) return 0.0; val d = safe - base; return if (d <= 0) 1.0 else (revealed - base).toDouble() / d }
    fun rawMult(): Double = if (!started) J else (1 + t.prog * frac()) * G * J * (if (revealed >= safe) Rules.CLEAR else 1.0)
    fun mult(): Double = min(lim, rawMult())
}

// ===================================================================== the solver (src/board/solver.js)
class Solved(val km: IntArray, val ks: IntArray, val p: FloatArray, val v: Int)

object Solver {
    fun deduce(b: Board, subset: Boolean = true): Pair<IntArray, IntArray> {
        val km = IntArray(b.n); val ks = IntArray(b.n)
        var changed = true; var passes = 0
        while (changed && passes < 80) {
            changed = false
            val info = ArrayList<Pair<List<Int>, Int>>()
            for (i in 0 until b.n) {
                if (b.open[i] == 0 || b.num[i] == 0) continue
                val hid = ArrayList<Int>(); var f = 0
                for (j in b.nb[i]) { if (km[j] == 1) f++ else if (b.open[j] == 0 && ks[j] == 0) hid.add(j) }
                if (hid.isEmpty()) continue
                val r = b.num[i] - f
                when {
                    r == hid.size -> { hid.forEach { km[it] = 1 }; changed = true }
                    r == 0 -> { hid.forEach { ks[it] = 1 }; changed = true }
                    else -> info.add(hid to r)
                }
            }
            if (!changed && subset) {
                outer@ for (a in info) for (bb in info) {
                    if (a === bb || a.first.size >= bb.first.size || !a.first.all { it in bb.first }) continue
                    val diff = bb.first.filter { it !in a.first }; val dr = bb.second - a.second
                    if (dr == 0) { diff.forEach { ks[it] = 1 }; changed = true; break@outer }
                    if (dr == diff.size) { diff.forEach { km[it] = 1 }; changed = true; break@outer }
                }
            }
            passes++
        }
        return km to ks
    }

    /** Mine odds as 32-bit floats, exactly like the web game's Float32Array. */
    fun odds(b: Board, km: IntArray, ks: IntArray): FloatArray {
        val p = FloatArray(b.n) { Float.NaN }
        var kmc = 0; var unk = 0
        for (i in 0 until b.n) { if (b.open[i] == 1) continue; if (km[i] == 1) kmc++ else if (ks[i] == 0) unk++ }
        val glob = if (unk > 0) max(0.0, min(1.0, (b.m - kmc).toDouble() / unk)) else 0.0
        for (i in 0 until b.n) {
            if (b.open[i] == 0 || b.num[i] == 0) continue
            val hid = ArrayList<Int>(); var f = 0
            for (j in b.nb[i]) { if (km[j] == 1) f++ else if (b.open[j] == 0 && ks[j] == 0) hid.add(j) }
            if (hid.isEmpty()) continue
            val q = max(0.0, min(1.0, (b.num[i] - f).toDouble() / hid.size))
            for (j in hid) p[j] = if (p[j].isNaN()) q.toFloat() else max(p[j].toDouble(), q).toFloat()
        }
        for (i in 0 until b.n) {
            if (b.open[i] == 1 || ks[i] == 1) p[i] = 0f else if (km[i] == 1) p[i] = 1f else if (p[i].isNaN()) p[i] = glob.toFloat()
        }
        return p
    }

    fun solve(b: Board): Solved {
        val d = b.ded
        if (d != null && d.v == b.revealed) return d
        val (km, ks) = deduce(b, true)
        return Solved(km, ks, odds(b, km, ks), b.revealed).also { b.ded = it }
    }

    fun riskOf(b: Board, i: Int): Double { val d = solve(b); return if (d.ks[i] == 1) 0.0 else min(0.95, d.p[i].toDouble()) }
}

// ===================================================================== the Daily Challenge (src/game/daily.js)
data class DigResult(val why: String?, val p: Double, val gem: GemTier?)

object Daily {
    private val EPOCH = LocalDate.of(Rules.DAILY_EPOCH[0], Rules.DAILY_EPOCH[1], Rules.DAILY_EPOCH[2])
    private val MONTHS = listOf("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")
    val EMOJI = mapOf("safe" to "🟩", "r1" to "🟨", "r2" to "🟧", "r3" to "🟥", "gem" to "💎", "boom" to "💥", "cash" to "💰", "clear" to "🏁", "limit" to "🚀")

    fun key(d: LocalDate = LocalDate.now()): String = d.toString()
    fun number(key: String): Int = ChronoUnit.DAYS.between(EPOCH, LocalDate.parse(key)).toInt() + 1

    fun create(key: String): Board {
        val rng = seeded(hashString(Rules.DAILY_SEED + key))
        val t = Rules.TABLES.first { it.id == Rules.DAILY_TABLE }
        val b = Board(t, 0, t.m, Rules.DAILY_LIMIT, rng)
        val row = 2 + floor(rng() * (t.h - 4)).toInt()
        val col = 2 + floor(rng() * (t.w - 4)).toInt()
        val start = row * t.w + col
        b.placeMines(start); b.started = true; b.flood(start); b.base = b.revealed
        b.placeGems(Rules.DAILY_GEMS)
        return b
    }

    fun dig(b: Board, i: Int): DigResult {
        if (b.over || b.open[i] == 1 || b.flag[i] == 1) return DigResult(null, 0.0, null)
        val p = Solver.riskOf(b, i)
        if (b.mine[i] == 1) { b.moves.add("boom"); b.over = true; return DigResult("boom", p, null) }
        val opened = b.flood(i)
        var gem: GemTier? = null
        if (p > 0) { b.G *= 1 + Rules.BOOST * p / (1 - p); b.guesses++; b.combo++ }
        for (j in opened) if (b.gem[j] != 0.0) { b.J *= b.gem[j]; b.gemsFound++; gem = gemTier(b.gem[j]) }
        b.moves.add(if (gem != null) "gem" else if (p >= .5) "r3" else if (p >= .25) "r2" else if (p > 0) "r1" else "safe")
        if (b.revealed >= b.safe) { b.over = true; return DigResult("clear", p, gem) }
        if (b.rawMult() >= b.lim) { b.over = true; return DigResult("limit", p, gem) }
        return DigResult(null, p, gem)
    }

    /** The group chat plays the same daily; their scores come from the date too. */
    fun friends(key: String): List<Pair<String, Double>> {
        val rng = seeded(hashString(Rules.DAILY_CHAT_SEED + key))
        return Rules.DAILY_STYLES.map { s ->
            val blew = rng() < s.boom
            val r = rng()
            val x = s.lo + (s.hi - s.lo) * (r * r)
            s.who to (if (blew) 0.0 else round2(x))
        }
    }

    fun share(key: String, why: String, mult: Double, gems: Int, total: Int, moves: List<String>): String {
        val d = LocalDate.parse(key)
        val head = if (why == "boom") "blew up 💥" else "×${"%.2f".format(java.util.Locale.ROOT, mult)} ${EMOJI[why]}"
        val trail = moves.map { EMOJI.getValue(it) } + (if (why == "boom") emptyList() else listOf(EMOJI.getValue(why)))
        val rows = trail.chunked(10).joinToString("\n") { it.joinToString("") }
        val digs = moves.size
        return "Sweepstakes Daily #${number(key)} · ${d.dayOfMonth} ${MONTHS[d.monthValue - 1]}\n" +
            "$head · 💎 $gems/$total · $digs dig${if (digs == 1) "" else "s"}\n$rows"
    }
}
