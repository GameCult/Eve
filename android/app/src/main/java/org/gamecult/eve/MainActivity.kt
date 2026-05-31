package org.gamecult.eve

import android.app.Activity
import android.graphics.Color
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.ScrollView
import android.widget.TextView
import org.gamecult.cultmesh.CultMeshNode
import org.gamecult.cultmesh.CultNetFrame
import org.gamecult.cultmesh.CultNetWebSocketClient
import org.gamecult.cultmesh.eve.EveDashboardCommandDocument
import org.gamecult.cultmesh.eve.EveDashboardNodeSnapshot
import org.gamecult.cultmesh.eve.EveDashboardStateDocument
import org.gamecult.cultmesh.eve.EveDashboardUiElement
import org.gamecult.cultmesh.eve.EveSensorObservationDocument
import java.net.URI
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.Executors

class MainActivity : Activity(), SensorEventListener {
    private val mesh = CultMeshNode()
    private val main = Handler(Looper.getMainLooper())
    private val workers = Executors.newCachedThreadPool()
    private val deviceId = "periwinkle"
    private val clientId = "eve-android-periwinkle"
    private val dashboardUri = URI.create("ws://192.168.1.66:8795/eve/deck/cultmesh")
    private val sensorUri = URI.create("ws://192.168.1.66:8796/eve/periwinkle")

    private var sensorManager: SensorManager? = null
    private var dashboardSocket: CultNetWebSocketClient? = null
    private var sensorSocket: CultNetWebSocketClient? = null
    private var latestState: EveDashboardStateDocument? = null
    private var commandSequence = 0L
    private var sensorSequence = 0L
    private var touchSequence = 0L

    private lateinit var brokerText: TextView
    private lateinit var selectedText: TextView
    private lateinit var sensorText: TextView
    private lateinit var touchText: TextView
    private lateinit var surfaceList: LinearLayout

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        sensorManager = getSystemService(SENSOR_SERVICE) as? SensorManager
        setContentView(buildUi())
        startSensors()
        connectDashboard()
        connectSensorUplink()
    }

    override fun onDestroy() {
        super.onDestroy()
        sensorManager?.unregisterListener(this)
        dashboardSocket?.close()
        sensorSocket?.close()
        workers.shutdownNow()
    }

    private fun buildUi(): ScrollView {
        val scroll = ScrollView(this).apply {
            isFillViewport = true
            setBackgroundColor(Color.rgb(2, 9, 9))
        }
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(18), dp(18), dp(18), dp(18))
        }
        scroll.addView(root, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))
        root.addView(label("EVE / PERIWINKLE", 26f, 0xff8efcff.toInt(), true))
        root.addView(label("CultMesh dashboard and sensor edge", 14f, 0xffb7c7c7.toInt(), false))
        brokerText = card("CultMesh broker\nconnecting $dashboardUri")
        selectedText = card("selection\nwaiting for dashboard state")
        sensorText = card("CultMesh sensors\nconnecting $sensorUri")
        touchText = card("touch surface\nwaiting for operator input")
        surfaceList = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        root.addView(brokerText)
        root.addView(selectedText)
        root.addView(surfaceList)
        root.addView(sensorText)
        root.addView(touchText)
        root.addView(card("contract\nPeriwinkle consumes mimir.eve_dashboard_state.v1, sends mimir.eve_dashboard_command.v1, and publishes mimir.eve_sensor_observation.v1. Mimir accepts meaning; Android renders and observes."))
        return scroll
    }

    private fun label(text: String, sp: Float, color: Int, title: Boolean): TextView =
        TextView(this).apply {
            this.text = text
            textSize = sp
            setTextColor(color)
            gravity = Gravity.START
            includeFontPadding = true
            typeface = android.graphics.Typeface.create(android.graphics.Typeface.MONOSPACE, if (title) android.graphics.Typeface.BOLD else android.graphics.Typeface.NORMAL)
        }

    private fun card(text: String): TextView =
        label(text, 14f, 0xffe6f1f1.toInt(), false).apply {
            layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
                setMargins(0, dp(14), 0, 0)
            }
            setPadding(dp(14), dp(12), dp(14), dp(12))
            setBackgroundColor(Color.rgb(7, 25, 24))
        }

    private fun connectDashboard() {
        workers.execute {
            while (!Thread.currentThread().isInterrupted) {
                try {
                    dashboardSocket = mesh.connect(dashboardUri)
                    postBroker("CultMesh broker\nconnected $dashboardUri\ndocument=mimir.eve_dashboard_state.v1")
                    while (!Thread.currentThread().isInterrupted) {
                        val frame: CultNetFrame = dashboardSocket!!.readFrame()
                        if (frame.opcode == 0x8) error("dashboard closed")
                        if (frame.opcode == 0x2) {
                            val state = EveDashboardStateDocument.decode(frame.payload)
                            mesh.remember(EveDashboardStateDocument, state.providerId, state)
                            main.post { renderState(state) }
                        }
                    }
                } catch (ex: Exception) {
                    postBroker("CultMesh broker\nwaiting for Mimir\n${ex.javaClass.simpleName}: ${ex.message}")
                    Thread.sleep(2000)
                }
            }
        }
    }

    private fun connectSensorUplink() {
        workers.execute {
            while (!Thread.currentThread().isInterrupted) {
                try {
                    sensorSocket = mesh.connect(sensorUri)
                    postSensor("CultMesh sensors\nconnected $sensorUri\ndocument=mimir.eve_sensor_observation.v1")
                    return@execute
                } catch (ex: Exception) {
                    postSensor("CultMesh sensors\nwaiting for receiver\n${ex.javaClass.simpleName}: ${ex.message}")
                    Thread.sleep(2000)
                }
            }
        }
    }

    private fun renderState(state: EveDashboardStateDocument) {
        latestState = state
        val surface = state.surface
        brokerText.text = "CultMesh broker\nprovider=${state.providerId}\nversion=${state.version} nodes=${state.nodes.size} surface=${surface?.schema ?: "none"}\nupdated=${state.updatedAt}"
        selectedText.text = "selection\n${state.title}\nselected=${state.selectedNodeId}\nlut=${state.lutPreset}"
        surfaceList.removeAllViews()
        if (surface != null) {
            surfaceList.addView(label(surface.title.ifBlank { surface.id }, 16f, 0xff8efcff.toInt(), true).apply {
                setPadding(0, dp(14), 0, 0)
            })
            surfaceList.addView(renderElement(surface.root, 0))
            return
        }
        state.nodes.filter { it.visible }.forEach { node ->
            surfaceList.addView(card("${node.label}\n${node.kind} / ${node.health}\n${node.id}").apply {
                setOnClickListener {
                    if (node.command == "open-provider" && !node.providerId.isNullOrBlank()) sendCommand("open-provider", node)
                    else sendCommand("select", node)
                }
                setOnLongClickListener {
                    sendCommand("toggle-visibility", node)
                    true
                }
            })
        }
    }

    private fun renderElement(element: EveDashboardUiElement, depth: Int): View {
        element.metric?.let { metric ->
            return LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                layoutParams = elementLayoutParams(element, depth)
                setPadding(dp(12), dp(10), dp(12), dp(10))
                setBackgroundColor(toneColor(metric.tone, element.style?.variant))
                addView(label("${metric.label}  ${(metric.value * 100.0).toInt()}%", 13f, 0xffe6f1f1.toInt(), true))
                addView(ProgressBar(this@MainActivity, null, android.R.attr.progressBarStyleHorizontal).apply {
                    max = 100
                    progress = (metric.value.coerceIn(0.0, 1.0) * 100.0).toInt()
                })
                attachCommandHandlers(this, element)
            }
        }

        if (element.children.isEmpty()) {
            return label(elementText(element), textSizeFor(element), textColorFor(element), element.role == "title" || element.role == "strong").apply {
                layoutParams = elementLayoutParams(element, depth)
                setPadding(dp(10), dp(8), dp(10), dp(8))
                if (element.kind == "card" || element.kind == "avatar") setBackgroundColor(toneColor(element.style?.tone, element.style?.variant))
                attachCommandHandlers(this, element)
            }
        }

        return LinearLayout(this).apply {
            orientation = if (element.layout?.direction == "horizontal") LinearLayout.HORIZONTAL else LinearLayout.VERTICAL
            layoutParams = elementLayoutParams(element, depth)
            val padding = element.layout?.padding?.toInt() ?: if (element.kind == "card" || element.kind == "pane") 10 else 0
            setPadding(dp(padding), dp(padding), dp(padding), dp(padding))
            if (element.kind == "card" || element.kind == "pane") setBackgroundColor(toneColor(element.style?.tone, element.style?.variant))
            val heading = element.text
            if (!heading.isNullOrBlank()) {
                addView(label(heading, textSizeFor(element), textColorFor(element), element.kind == "pane" || element.role == "title").apply {
                    setPadding(0, 0, 0, dp(6))
                })
            }
            element.children.forEach { child -> addView(renderElement(child, depth + 1)) }
            attachCommandHandlers(this, element)
        }
    }

    private fun attachCommandHandlers(view: View, element: EveDashboardUiElement) {
        if (element.bindNodeId.isNullOrBlank() && element.commandId.isNullOrBlank()) return
        view.isClickable = true
        view.setOnClickListener { sendSurfaceCommand(element) }
        view.setOnLongClickListener {
            val node = latestState?.nodes?.firstOrNull { it.id == element.bindNodeId }
            if (node != null) sendCommand("toggle-visibility", node)
            true
        }
    }

    private fun sendSurfaceCommand(element: EveDashboardUiElement) {
        val state = latestState ?: return
        val node = state.nodes.firstOrNull { it.id == element.bindNodeId } ?: return
        val type = when {
            element.commandId?.startsWith("open-provider:", ignoreCase = true) == true -> "open-provider"
            else -> "select"
        }
        sendCommand(type, node)
    }

    private fun elementLayoutParams(element: EveDashboardUiElement, depth: Int): LinearLayout.LayoutParams {
        val params = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
        params.setMargins(0, dp(if (depth == 0) 10 else 8), 0, 0)
        return params
    }

    private fun elementText(element: EveDashboardUiElement): String =
        when {
            !element.text.isNullOrBlank() -> element.text ?: ""
            !element.assetUri.isNullOrBlank() -> "avatar\n${element.assetUri ?: ""}"
            !element.assetRef.isNullOrBlank() -> "asset\n${element.assetRef ?: ""}"
            else -> "${element.kind}\n${element.id}"
        }

    private fun textSizeFor(element: EveDashboardUiElement): Float = when (element.role) {
        "title" -> 18f
        "strong" -> 15f
        "caption" -> 12f
        "mono" -> 12f
        else -> if (element.kind == "pane") 16f else 14f
    }

    private fun textColorFor(element: EveDashboardUiElement): Int = when (element.role) {
        "caption" -> 0xff9eb8b8.toInt()
        "title", "strong" -> 0xffffffff.toInt()
        else -> 0xffe6f1f1.toInt()
    }

    private fun toneColor(tone: String?, variant: String?): Int = when {
        variant == "selected" -> Color.rgb(22, 58, 55)
        variant == "active-turn" -> Color.rgb(12, 55, 58)
        variant == "mention-turn" -> Color.rgb(58, 44, 12)
        tone == "danger" -> Color.rgb(58, 18, 24)
        tone == "warm" -> Color.rgb(50, 36, 15)
        tone == "cool" -> Color.rgb(10, 38, 48)
        else -> Color.rgb(7, 25, 24)
    }

    private fun sendCommand(type: String, node: EveDashboardNodeSnapshot) {
        val socket = dashboardSocket ?: return
        val state = latestState ?: return
        val sequence = ++commandSequence
        val command = EveDashboardCommandDocument(
            commandId = "$type:$sequence",
            deviceId = deviceId,
            clientId = clientId,
            providerId = node.providerId ?: state.providerId,
            type = type,
            nodeId = node.id,
            visible = if (type == "toggle-visibility") !node.visible else null,
            sequence = sequence,
            deviceTimestampNs = SystemClock.elapsedRealtimeNanos(),
        )
        mesh.remember(EveDashboardCommandDocument, command.commandId, command)
        workers.execute { runCatching { socket.sendBinary(EveDashboardCommandDocument.encode(command)) } }
    }

    private fun startSensors() {
        val manager = sensorManager ?: run {
            sensorText.text = "CultMesh sensors\nSensorManager unavailable"
            return
        }
        manager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)?.let { manager.registerListener(this, it, SensorManager.SENSOR_DELAY_GAME) }
        manager.getDefaultSensor(Sensor.TYPE_GYROSCOPE)?.let { manager.registerListener(this, it, SensorManager.SENSOR_DELAY_GAME) }
    }

    override fun onSensorChanged(event: SensorEvent) {
        val elapsedNs = SystemClock.elapsedRealtimeNanos()
        val values = doubleArrayOf(event.values.getOrElse(0) { 0f }.toDouble(), event.values.getOrElse(1) { 0f }.toDouble(), event.values.getOrElse(2) { 0f }.toDouble())
        val sequence = ++sensorSequence
        val kind = if (event.sensor.type == Sensor.TYPE_GYROSCOPE) "gyroscope" else "accelerometer"
        sensorText.text = "CultMesh sensors\n$kind\nseq=$sequence sensorTs=${event.timestamp}\nelapsedNs=$elapsedNs\nx=%+.3f y=%+.3f z=%+.3f".format(Locale.US, values[0], values[1], values[2])
        sendObservation(kind, sequence, event.timestamp, elapsedNs, values, accuracy = event.accuracy)
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit

    override fun dispatchTouchEvent(event: MotionEvent): Boolean {
        val sequence = ++touchSequence
        val elapsedNs = SystemClock.elapsedRealtimeNanos()
        touchText.text = "touch surface\nseq=$sequence action=${event.actionMasked} pointers=${event.pointerCount} eventTime=${event.eventTime} x=%.1f y=%.1f".format(Locale.US, event.x, event.y)
        sendObservation("touch", sequence, event.eventTime * 1_000_000L, elapsedNs, doubleArrayOf(), action = actionName(event.actionMasked), pointerCount = event.pointerCount, x = event.x.toDouble(), y = event.y.toDouble())
        return super.dispatchTouchEvent(event)
    }

    private fun sendObservation(
        kind: String,
        sequence: Long,
        sensorTimestampNs: Long,
        elapsedNs: Long,
        values: DoubleArray,
        action: String? = null,
        pointerCount: Int? = null,
        x: Double? = null,
        y: Double? = null,
        accuracy: Int? = null,
    ) {
        val socket = sensorSocket ?: return
        val observation = EveSensorObservationDocument(
            observationId = "$deviceId:$kind:$sequence",
            deviceId = deviceId,
            streamId = "periwinkle-$kind",
            kind = kind,
            sequence = sequence,
            sensorTimestampNs = sensorTimestampNs,
            elapsedRealtimeNs = elapsedNs,
            wallClockUtc = utcNow(),
            clockDomainId = "periwinkle-elapsed-realtime",
            values = values,
            action = action,
            pointerCount = pointerCount,
            x = x,
            y = y,
            accuracy = accuracy,
        )
        mesh.remember(EveSensorObservationDocument, observation.observationId, observation)
        workers.execute {
            runCatching { socket.sendBinary(EveSensorObservationDocument.encode(observation)) }
                .onFailure {
                    sensorSocket?.close()
                    sensorSocket = null
                    connectSensorUplink()
                }
        }
    }

    private fun postBroker(text: String) = main.post { brokerText.text = text }
    private fun postSensor(text: String) = main.post { sensorText.text = text }
    private fun dp(value: Int): Int = (value * resources.displayMetrics.density + 0.5f).toInt()

    private fun actionName(action: Int): String = when (action) {
        MotionEvent.ACTION_DOWN -> "down"
        MotionEvent.ACTION_UP -> "up"
        MotionEvent.ACTION_MOVE -> "move"
        MotionEvent.ACTION_CANCEL -> "cancel"
        else -> "action-$action"
    }

    private fun utcNow(): String =
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }.format(Date())
}
