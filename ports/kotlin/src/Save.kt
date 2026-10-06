// The save file, shared by the Python, Kotlin and C# versions (key=value lines): your coins follow you between languages.
package sweepstakes

import java.io.File

class Save {
    companion object {
        var path = File(System.getProperty("user.home"), ".sweepstakes" + File.separator + "save.txt").path
        val DEFAULTS: LinkedHashMap<String, Any> = linkedMapOf(
            "coins" to Rules.START, "unlocked" to "penny", "busts" to 0L, "streak" to 0L, "shields" to 0L, "goggles" to 0L, "charm" to 0L,
            "casinos" to 0L, "best" to Rules.START, "boards" to 0L,
            "daily_key" to "", "daily_why" to "", "daily_mult" to 0.0, "daily_digs" to 0L, "daily_gems" to 0L, "daily_total" to 0L,
            "daily_moves" to "", "daily_prize" to 0L, "daily_streak" to 0L, "daily_last" to "", "daily_best" to 0.0)
    }

    val v = LinkedHashMap<String, Any>(DEFAULTS)

    init {
        try {
            File(path).takeIf { it.exists() }?.forEachLine(Charsets.UTF_8) { line ->
                val at = line.indexOf('=')
                if (at > 0 && !line.startsWith("#")) {
                    val k = line.substring(0, at); val raw = line.substring(at + 1)
                    when (DEFAULTS[k]) {
                        is Long -> raw.toLongOrNull()?.let { v[k] = it }
                        is Double -> raw.toDoubleOrNull()?.let { v[k] = it }
                        is String -> v[k] = raw
                    }
                }
            }
        } catch (e: Exception) { /* a broken save just means a fresh start */ }
    }

    fun long(k: String) = v[k] as Long
    fun dbl(k: String) = v[k] as Double
    fun str(k: String) = v[k] as String
    operator fun set(k: String, value: Any) { v[k] = value }

    fun write() {
        try {
            val f = File(path); f.parentFile?.mkdirs()
            f.writeText("# Sweepstakes terminal save, shared by the Python, Kotlin and C# versions\n" +
                v.entries.joinToString("") { "${it.key}=${it.value}\n" }, Charsets.UTF_8)
        } catch (e: Exception) { println(c("  (couldn't save: ${e.message})", "dim")) }
    }
}
