// The game: menus, playing a board, the Daily Challenge, the shop, Double or Nothing and the coin flip.
package sweepstakes

import java.time.LocalDate
import java.time.LocalDateTime
import java.time.temporal.ChronoUnit
import kotlin.math.ceil
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.roundToLong
import kotlin.random.Random

class Game(private val s: Save) {
    companion object { var rnd: Random = Random.Default }

    private var oddsOn = false
    private var nextChirp = System.currentTimeMillis() + rnd.nextLong(150_000, 330_000)

    // ---- quick questions about the save
    private fun unlockedIds() = s.str("unlocked").split(",")
    private fun unlocked() = Rules.TABLES.filter { it.id in unlockedIds() }
    private fun topTable() = unlocked().last()
    private fun luck() = 1 + .08 * s.long("charm")
    private fun streakBonus() = min(s.long("streak"), 10L) * .1
    private fun addCoins(n: Double) {
        s["coins"] = max(0L, (s.long("coins") + n).toLong())
        s["best"] = max(s.long("best"), s.long("coins"))
    }

    private fun resetRun() {
        for (k in listOf("coins", "unlocked", "streak", "shields", "goggles", "charm", "boards")) s[k] = Save.DEFAULTS.getValue(k)
        s.write()
    }

    private fun bust(why: String) {
        println(c("\n  STUFFED.", "red") + " $why Back to ${fmt(Rules.START)}. Your daily streak and casinos survive.")
        say(if ("Double" in why) "don_lose" else "bust", 1.0)
        s["busts"] = s.long("busts") + 1
        resetRun()
    }

    private fun oddNoises() {
        if (System.currentTimeMillis() >= nextChirp) {
            nextChirp = System.currentTimeMillis() + rnd.nextLong(150_000, 330_000)
            println(c("\n  *chirp*", "dim") + " (a carbon monoxide alarm somewhere wants a new battery)")
            say("odd_co", .7)
        }
    }

    // ---- menus
    fun run() {
        println(c("""
   ____                            ___ _        _
  / ___|_      _____  ___ _ __   / __| |_ __ _| | _____  ___
  \___ \ \ /\ / / _ \/ _ \ '_ \  \__ \ __/ _` | |/ / _ \/ __|
   ___) \ V  V /  __/  __/ |_) |  __/ || (_| |   <  __/\__ \
  |____/ \_/\_/ \___|\___| .__/  |___/\__\__,_|_|\_\___||___/
                         |_|     terminal edition · Kotlin""", "gold"))
        say("hello", 1.0)
        while (true) {
            oddNoises()
            val key = Daily.key()
            val daily = if (s.str("daily_key") == key) (if (s.str("daily_why") != "boom") "×${fmtX(s.dbl("daily_mult"))} today" else "blew up today") else "not played yet"
            println("\n  Coins ${c(fmt(s.long("coins")), "gold")}   Streak ${s.long("streak")}   Shields ${s.long("shields")}   Busts ${s.long("busts")}" +
                (if (s.long("casinos") > 0) "   House edge +${25 * s.long("casinos")}%" else ""))
            println("  [1] Play a board          [2] Daily Challenge #${Daily.number(key)} ($daily)")
            println("  [3] Shop                  [4] Double or nothing")
            println("  [5] Coin flip             [6] How to play          [q] Quit")
            when (Term.ask("> ").lowercase()) {
                "1" -> play()
                "2" -> daily()
                "3" -> shop()
                "4" -> doubleOrNothing()
                "5" -> coinFlip()
                "6" -> howTo()
                "q", "quit", "exit" -> { s.write(); println("  See you tomorrow for the daily. My mum plays this game."); return }
            }
        }
    }

    private fun howTo() = println("""
  Dig tiles by typing a coordinate (C4). The numbers count the mines touching a tile.
  Your first dig on a board is always safe. Safe digs nudge the pot up a little.
  Risky digs, where the numbers can't prove a tile is safe, pay the odds: a 30% shot multiplies the pot by about 1.5.
  Gems ($) hide outside the opening and multiply the pot: x1.2, x1.5, x2 or a x5 jackpot.
  Cash out (c) whenever you like. Hit a mine and the stake is gone. Clearing the board adds x1.25.
  f C4 flags a tile. Win big boards in a row for a streak bonus (up to +100% profit).
  Double or nothing bets everything: x2, x5, x10, x25, x100. Lose and you're stuffed.
  The Daily Challenge is the same board for everyone, in every version of the game. One go a day.""")

    private fun pickTable(): Table? {
        println()
        Rules.TABLES.forEachIndexed { k, t ->
            if (t.id in unlockedIds()) println("  [${k + 1}] ${t.name.padEnd(13)} ${t.w}x${t.h}, ${t.m} mines, stake ${fmt(t.min)}-${fmt(t.cap)}, up to x${fmtLim(t.lim)}")
            else println(c("  [${k + 1}] ${t.name.padEnd(13)} locked: unlock for ${fmt(t.cost)}", "dim"))
        }
        val got = Term.ask("  Table (Enter for the best one you have): ")
        if (got.isEmpty()) return topTable()
        val k = got.toIntOrNull() ?: return null
        if (k !in 1..Rules.TABLES.size) return null
        val t = Rules.TABLES[k - 1]
        if (t.id in unlockedIds()) return t
        if (s.long("coins") < t.cost) { println("  You need ${fmt(t.cost)} to unlock ${t.name}."); return null }
        if (Term.ask("  Unlock ${t.name} for ${fmt(t.cost)}? (y/n) ").lowercase().startsWith("y")) {
            addCoins(-t.cost)
            s["unlocked"] = s.str("unlocked") + "," + t.id
            println(c("  ${t.name} unlocked. ${t.blurb}", "green"))
            say("unlock", 1.0)
            s.write()
            return t
        }
        return null
    }

    private fun play() {
        val t = pickTable() ?: return
        val lo = t.min.toLong(); val hi = min(t.cap, s.long("coins").toDouble()).toLong()
        if (hi < lo) { println("  You need ${fmt(lo)} coins to sit at ${t.name}."); return }
        val default = max(lo.toDouble(), min(hi.toDouble(), nice(max(lo.toDouble(), s.long("coins") / 5.0)))).toLong()
        val got = Term.ask("  Stake ${fmt(lo)}-${fmt(hi)} (Enter for ${fmt(default)}): ").replace(",", "")
        val stake = if (got.isEmpty()) default else got.toLongOrNull() ?: -1L
        if (stake !in lo..hi) { println("  That stake is off the table."); return }
        val golden = rnd.nextDouble() < Rules.GOLDEN
        val b = Board(t, stake, t.m, t.lim * (if (golden) 2 else 1))
        b.golden = golden; b.J = if (golden) 2.0 else 1.0
        addCoins(-stake.toDouble())
        s["boards"] = s.long("boards") + 1
        if (golden) { println(c("  GOLDEN BOARD: x2 pot, double limit.", "gold")); say("golden") }
        else if (stake >= max(500.0, (s.long("coins") + stake) * .4)) say("deal_big", vars = mapOf("stake" to fmt(stake)))
        boardLoop(b)
        if (s.long("coins") < Rules.TABLES[0].min) bust("Out of coins.")
        s.write()
    }

    private fun pot(b: Board) = floor(b.stake + b.stake * (b.mult() - 1) * (1 + streakBonus()))

    private fun hud(b: Board) {
        val hot = if (b.mult() >= 10) "red" else if (b.mult() >= 3) "orange" else "gold"
        println("  Mult ${c("x" + fmtX(b.mult()), hot)}   Pot ${c(fmt(pot(b)), "gold")}   Gems ${b.gemsFound}/${b.gemsTotal}   " +
            "Mines ${b.m}   Limit x${fmtLim(b.lim)}   Shields ${s.long("shields")}")
    }

    private fun boardLoop(b: Board): String {
        while (true) {
            oddNoises()
            println(); draw(b, oddsOn = oddsOn); hud(b)
            val cmd = Term.ask("  dig C4 · f C4 flag · c cash out" + (if (s.long("goggles") > 0) " · o odds" else "") + " · ? help > ")
            val low = cmd.lowercase()
            when {
                low == "c" || low == "cash" -> { if (!b.started) { println("  Dig a tile first."); continue }; return cashOut(b, "manual") }
                low == "?" -> { howTo(); continue }
                low == "o" && s.long("goggles") > 0 -> { oddsOn = !oddsOn; continue }
                low.startsWith("f ") -> { val i = parseCoord(cmd.substring(2), b); if (i != null && b.open[i] == 0) b.flag[i] = b.flag[i] xor 1; continue }
            }
            val i = parseCoord(if (low.startsWith("d ")) cmd.substring(2) else cmd, b)
            if (i == null) { println("  Type a tile like C4, f C4 to flag, or c to cash out."); continue }
            if (b.open[i] == 1 || b.flag[i] == 1) continue
            dig(b, i)?.let { return it }
        }
    }

    private fun dig(b: Board, i: Int): String? {
        if (!b.started) {
            b.placeMines(i); b.started = true; b.flood(i); b.base = b.revealed; b.placeGems(b.gemsTotal)
            return null
        }
        val p = Solver.riskOf(b, i)
        if (b.mine[i] == 1) {
            b.combo = 0
            if (s.long("shields") > 0) {
                s["shields"] = s.long("shields") - 1; b.flag[i] = 1
                println(c("  SHIELD! That was a mine at ${coord(i, b.w)}. Shield used, mine flagged.", "cyan"))
                say("shield")
                return null
            }
            return boom(b, i)
        }
        val opened = b.flood(i)
        if (p > 0) {
            val k = 1 + Rules.BOOST * p / (1 - p)
            b.G *= k; b.guesses++; b.combo++
            val col = if (p < .2) "green" else if (p < .35) "gold" else "red"
            println(c("  Risky dig (${(p * 100).roundToInt()}% mine): pot x${"%.2f".format(java.util.Locale.ROOT, k)}" + (if (b.combo > 1) "   COMBO ${b.combo}" else ""), col))
        }
        for (j in opened) if (b.gem[j] != 0.0) {
            val tier = gemTier(b.gem[j])
            b.J *= b.gem[j]; b.gemsFound++
            println(c("  ${tier.name.uppercase()}! x${fmtGem(b.gem[j])}", if (tier.k == "jackpot") "red" else "gold"))
            say(if (tier.k == "jackpot") "jackpot" else "gem", if (tier.k == "jackpot") 1.0 else .35)
        }
        quip(.04)
        if (b.revealed >= b.safe) return cashOut(b, "clear")
        if (b.rawMult() >= b.lim) return cashOut(b, "limit")
        return null
    }

    private fun fmtGem(x: Double) = if (x == floor(x)) x.toLong().toString() else x.toString()

    private fun boom(b: Board, i: Int): String {
        b.over = true
        println(); draw(b, reveal = true)
        val left = b.safe - b.revealed; val missed = b.hiddenGems()
        val near = if (left in 1..5) "$left tile${if (left > 1) "s" else ""} from a clean sweep" else if (missed > 0) "$missed gem${if (missed > 1) "s" else ""} still down there" else ""
        println(c("  BOOM at ${coord(i, b.w)}. -${fmt(b.stake)}", "red") + (if (near.isNotEmpty()) "  ($near)" else ""))
        s["streak"] = 0L
        say("boom", vars = mapOf("stake" to fmt(b.stake)))
        quip(.15)
        return "boom"
    }

    private fun cashOut(b: Board, why: String): String {
        b.over = true
        val mult = b.mult()
        var amount = pot(b)
        var profit = amount - b.stake
        if (s.long("casinos") > 0 && profit > 0) { amount += floor(profit * .25 * s.long("casinos")); profit = amount - b.stake } // New Game+
        addCoins(amount)
        if (profit > 0 && (b.frac() >= .5 || mult >= 2)) {
            s["streak"] = s.long("streak") + 1
            if (s.long("streak") >= 3) say("streak", vars = mapOf("streak" to s.long("streak").toString()))
        }
        println(); draw(b, reveal = true)
        val label = mapOf("clear" to "CLEAN SWEEP", "limit" to "TABLE LIMIT")[why] ?: "Cashed out"
        println(c("  $label: +${fmt(profit)} (x${fmtX(mult)})", "green"))
        val tier = if (mult >= 50) 3 else if (mult >= 15) 2 else if (mult >= 5) 1 else 0
        if (tier > 0) println(c("  *** ${listOf("", "BIG WIN", "HUGE WIN", "MEGA WIN")[tier]} ***", listOf("", "gold", "orange", "red")[tier]))
        say(if (why == "clear") "clear" else if (profit >= max(300.0, b.stake.toDouble())) "cash_big" else "cash_small", vars = mapOf("profit" to fmt(profit)))
        return "cash"
    }

    // ---- the Daily Challenge
    private fun daily() {
        val key = Daily.key()
        if (s.str("daily_key") == key) return dailyResult(key)
        val b = Daily.create(key)
        println(c("\n  DAILY #${Daily.number(key)}", "gold") + " · the same board for everyone today, in every version. No shields, no stake. One go.")
        var why: String? = null
        while (!b.over) {
            println(); draw(b)
            println("  Mult ${c("x" + fmtX(b.mult()), "gold")}   Prize ${fmt(topTable().cap * Rules.DAILY_PRIZE * b.mult())}   Gems ${b.gemsFound}/${b.gemsTotal}")
            val cmd = Term.ask("  dig C4 · f C4 flag · c cash out > ")
            val low = cmd.lowercase()
            if (low == "c" || low == "cash") { b.over = true; why = "cash"; break }
            if (low.startsWith("f ")) { val i = parseCoord(cmd.substring(2), b); if (i != null && b.open[i] == 0) b.flag[i] = b.flag[i] xor 1; continue }
            val i = parseCoord(cmd, b)
            if (i == null) { println("  Type a tile like C4, f C4 to flag, or c to cash out."); continue }
            val r = Daily.dig(b, i)
            why = r.why
            if (r.p > 0 && r.why != "boom") println(c("  Risky dig (${(r.p * 100).roundToInt()}% mine): pot x${"%.2f".format(java.util.Locale.ROOT, 1 + Rules.BOOST * r.p / (1 - r.p))}", "gold"))
            r.gem?.let { println(c("  ${it.name.uppercase()}! x${fmtGem(it.x)}", "gold")) }
        }
        val end = why ?: "cash"
        val mult = if (end == "boom") 0.0 else b.mult()
        val prize = if (end == "boom") 0L else (topTable().cap * Rules.DAILY_PRIZE * mult).roundToLong()
        println(); draw(b, reveal = true)
        val yesterday = LocalDate.parse(key).minusDays(1).toString()
        s["daily_streak"] = if (s.str("daily_last") == yesterday) s.long("daily_streak") + 1 else 1L
        s["daily_key"] = key; s["daily_why"] = end; s["daily_mult"] = mult; s["daily_digs"] = b.moves.size.toLong()
        s["daily_gems"] = b.gemsFound.toLong(); s["daily_total"] = b.gemsTotal.toLong(); s["daily_moves"] = b.moves.joinToString(",")
        s["daily_prize"] = prize; s["daily_last"] = key; s["daily_best"] = max(s.dbl("daily_best"), mult)
        addCoins(prize.toDouble())
        s.write()
        val top = mult > 0 && Daily.friends(key).all { mult > it.second }
        say(if (end == "boom") "daily_boom" else if (top) "daily_top" else "daily_ok", .9, mapOf("x" to fmtX(mult)))
        dailyResult(key)
    }

    private fun dailyResult(key: String) {
        val rows = (listOf("you" to s.dbl("daily_mult")) + Daily.friends(key)).sortedByDescending { it.second }
        println(c("\n  DAILY #${Daily.number(key)} RESULTS", "gold"))
        rows.forEachIndexed { k, (who, m) ->
            val name = if (who == "you") "You" else Rules.FRIENDS.getValue(who)
            val line = "  ${k + 1}. ${name.padEnd(14)} ${if (m > 0) "x" + fmtX(m) else "blew up"}"
            println(if (who == "you") c(line, "gold") else line)
        }
        val streak = s.long("daily_streak")
        println("  Prize: +${fmt(s.long("daily_prize"))} coins. Streak: $streak day${if (streak != 1L) "s" else ""}.")
        println("\n  Share it (copy these lines):\n")
        val moves = s.str("daily_moves").split(",").filter { it.isNotEmpty() }
        println(Daily.share(key, s.str("daily_why"), s.dbl("daily_mult"), s.long("daily_gems").toInt(), s.long("daily_total").toInt(), moves))
        val now = LocalDateTime.now(); val mins = ChronoUnit.MINUTES.between(now, now.toLocalDate().plusDays(1).atStartOfDay())
        println(c("\n  Next board in ${mins / 60}h ${mins % 60}m.", "dim"))
    }

    // ---- shop, double or nothing, coin flip
    private class Item(val id: String, val name: String, val desc: String, val cost: Double, val available: Boolean)

    private fun shop() {
        while (true) {
            val cap = topTable().cap; val charm = s.long("charm").toInt()
            val items = listOf(
                Item("shield", "Shield", "Survive one mine.", ceil(cap * .3), true),
                Item("goggles", "Dodgy Goggles", "Show each tile’s mine odds (o on a board).", 1_000_000.0, s.long("goggles") == 0L),
                Item("charm", "Lucky Charm (Lv $charm/3)", "+8% odds on flips and Double or Nothing.", listOf(2e6, 5e8, 1e11)[min(2, charm)], charm < 3),
                Item("casino", "Buy the Casino", "The whole building. New Game+: +25% profit forever.", Rules.CASINO, true))
            println("\n  SHOP · you have ${c(fmt(s.long("coins")), "gold")}")
            items.forEachIndexed { k, it ->
                println(if (it.available) "  [${k + 1}] ${it.name.padEnd(22)} ${fmt(it.cost).padStart(8)}  ${it.desc}" else c("  [${k + 1}] ${it.name.padEnd(22)}     done  ${it.desc}", "dim"))
            }
            val got = Term.ask("  Buy (number, Enter to leave): ")
            if (got.isEmpty()) return
            val k = got.toIntOrNull() ?: continue
            if (k !in 1..items.size) continue
            val it = items[k - 1]
            if (!it.available) continue
            if (s.long("coins") < it.cost) { println("  Not enough coins. You need ${fmt(it.cost)}."); continue }
            addCoins(-it.cost)
            when (it.id) {
                "shield" -> s["shields"] = s.long("shields") + 1
                "goggles" -> s["goggles"] = 1L
                "charm" -> s["charm"] = s.long("charm") + 1
                else -> {
                    s["casinos"] = s.long("casinos") + 1
                    println(c("\n  YOU OWN THE CASINO.", "gold") + " From ${fmt(Rules.START)} coins to the deeds.")
                    println("  New Game+: every win now pays +${25 * s.long("casinos")}% profit. Starting a fresh run.")
                    say("casino", 1.0)
                    resetRun()
                    return
                }
            }
            println(c("  ${it.name} bought.", "green"))
            say("buy")
            s.write()
        }
    }

    private fun doubleOrNothing() {
        if (s.long("coins") < 100) { println("  You need at least 100 coins to gamble the lot."); return }
        Rules.LADDER.forEachIndexed { step, m ->
            val stake = s.long("coins")
            val chance = min(.95, 1.0 / m * luck())
            println(c("\n  ${if (step == 0) "DOUBLE OR NOTHING" else "LET IT RIDE: x$m?"}", "red") +
                " Stake ${fmt(stake)} to win ${fmt(stake.toDouble() * m)}. Chance ${(chance * 100).roundToInt()}%.")
            say("don_offer", if (step > 0) .9 else .7)
            println(c("  ${Rules.SURE[step]}", "bold") + " Type YES to go" + (if (step > 0) ", anything else to walk away." else ", anything else to back out."))
            if (Term.ask("> ") != "YES") {
                if (step > 0) println(c("  Walked away with ${fmt(s.long("coins"))}. Smart. Boring, but smart.", "green"))
                return
            }
            repeat(3) { println("  ..."); System.out.flush(); Thread.sleep(250) }
            if (rnd.nextDouble() < chance) {
                s["coins"] = floor(stake.toDouble() * m).toLong()
                s["best"] = max(s.long("best"), s.long("coins"))
                println(c("  WON! You have ${fmt(s.long("coins"))}.", "green"))
                say("don_win", 1.0)
                s.write()
            } else {
                println(c("  Lost.", "red"))
                bust("Double or nothing said nothing.")
                return
            }
        }
        println(c("  You climbed the whole ladder. Absolute legend.", "gold"))
    }

    private fun coinFlip() {
        val coins = s.long("coins"); val default = max(1L, coins / 10)
        val got = Term.ask("  Bet (Enter for ${fmt(default)}): ").replace(",", "")
        val bet = if (got.isEmpty()) default else got.toLongOrNull() ?: 0L
        if (bet <= 0 || bet > coins) { println("  Bet something you actually have."); return }
        val side = Term.ask("  Heads or tails? (h/t) ").lowercase().take(1)
        if (side != "h" && side != "t") return
        val win = rnd.nextDouble() < min(.95, .5 * luck())
        val landed = if (win) side else if (side == "h") "t" else "h"
        println("  It's... ${if (landed == "h") "heads" else "tails"}!")
        addCoins(if (win) bet.toDouble() else -bet.toDouble())
        println(if (win) c("  +${fmt(bet)}. The coin likes you.", "green") else c("  -${fmt(bet)}. The coin does not like you.", "red"))
        say(if (win) "flip_win" else "flip_lose")
        if (s.long("coins") < Rules.TABLES[0].min) bust("Out of coins.")
        s.write()
    }
}
