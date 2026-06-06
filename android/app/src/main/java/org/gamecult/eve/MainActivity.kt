package org.gamecult.eve

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.BitmapFactory
import android.graphics.ImageFormat
import android.graphics.Paint
import android.graphics.Rect
import android.graphics.RectF
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.hardware.camera2.CameraCaptureSession
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraDevice
import android.hardware.camera2.CameraManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.Image
import android.media.ImageReader
import android.media.MediaRecorder
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.util.TypedValue
import android.widget.FrameLayout
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.ScrollView
import android.widget.Spinner
import android.widget.TextView
import org.gamecult.cultmesh.CultMeshNode
import org.gamecult.cultmesh.CultNetFrame
import org.gamecult.cultmesh.CultNetWebSocketClient
import org.gamecult.cultmesh.eve.EveDashboardCommandDocument
import org.gamecult.cultmesh.eve.EveDashboardNodeSnapshot
import org.gamecult.cultmesh.eve.EveDashboardStateDocument
import org.gamecult.cultmesh.eve.EveDashboardUiElement
import org.gamecult.cultmesh.eve.EveMediaObservationDocument
import org.gamecult.cultmesh.eve.EveSensorObservationDocument
import java.net.URI
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.Executors
import org.json.JSONObject

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
    private var mediaSequence = 0L
    @Volatile private var lastCameraSentElapsedNs = 0L
    @Volatile private var mediaRunning = false
    private var audioRecord: AudioRecord? = null
    private var cameraDevice: CameraDevice? = null
    private var cameraSession: CameraCaptureSession? = null
    private var imageReader: ImageReader? = null
    private var parityFixtureMode = false

    private lateinit var brokerText: TextView
    private lateinit var selectedText: TextView
    private lateinit var sensorText: TextView
    private lateinit var touchText: TextView
    private lateinit var mediaText: TextView
    private lateinit var providerPicker: Spinner
    private lateinit var providerOptionsList: LinearLayout
    private lateinit var surfaceList: LinearLayout
    private var providerPickerNodes: List<EveDashboardNodeSnapshot> = emptyList()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (intent.getBooleanExtra("org.gamecult.eve.PARITY_FIXTURE", false)) {
            parityFixtureMode = true
            setContentView(buildParityFixtureUi())
            return
        }
        sensorManager = getSystemService(SENSOR_SERVICE) as? SensorManager
        setContentView(buildUi())
        startSensors()
        connectDashboard()
        connectSensorUplink()
        requestMediaPermissionsAndStart()
    }

    private fun buildParityFixtureUi(): ScrollView {
        val raw = assets.open("current-surface.json").bufferedReader().use { it.readText() }
        val state = JSONObject(raw)
        val values = state.optJSONObject("values") ?: JSONObject()
        val surface = state.getJSONObject("surface")
        val styles = surface.optJSONObject("styles") ?: JSONObject()
        val tokens = styles.optJSONObject("tokens") ?: JSONObject()
        val rootNode = surface.getJSONObject("root")
        val scroll = ScrollView(this).apply {
            isFillViewport = true
            setBackgroundColor(tokenColor(tokens, "colorBackground", Color.rgb(2, 9, 9)))
        }
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(16), dp(16), dp(16), dp(16))
        }
        scroll.addView(root, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))
        root.addView(renderCultUiNode(rootNode, values, tokens))
        return scroll
    }

    private fun renderCultUiNode(node: JSONObject, values: JSONObject, tokens: JSONObject): View {
        val kind = node.optString("kind", "panel")
        val props = node.optJSONObject("props") ?: JSONObject()
        val children = node.optJSONArray("children")
        return when (kind) {
            "vn.stage" -> FrameLayout(this).apply {
                setBackgroundColor(tokenColor(tokens, "colorBackground", Color.rgb(5, 8, 13)))
                val visibleAxis = minOf(resources.displayMetrics.widthPixels, resources.displayMetrics.heightPixels)
                val height = visibleAxis - 48
                layoutParams = ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, height.coerceAtLeast(520))
                val dialogue = findChild(children, "panel.dialogue")
                val actions = findChild(children, "rail.actions")
                forEachChild(children) { child ->
                    val childKind = child.optString("kind", "")
                    if (childKind == "panel.dialogue" || childKind == "rail.actions") return@forEachChild
                    val view = renderCultUiNode(child, values, tokens)
                    val params = stageParams(child)
                    addView(view, params)
                }
                if (dialogue != null) {
                    val params = FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.BOTTOM)
                    params.setMargins(24, 24, 24, if (actions == null) 24 else 92)
                    addView(renderCultUiNode(dialogue, values, tokens), params)
                }
                if (actions != null) {
                    val params = FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.BOTTOM)
                    params.setMargins(24, 0, 24, 24)
                    addView(renderCultUiNode(actions, values, tokens), params)
                }
            }
            "image.background" -> StageBackgroundView(this, props.optString("label", "Scene"), tokenColor(tokens, "colorAccent", 0xffff8a2a.toInt())).apply {
                layoutParams = ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
            }
            "embed.norn" -> NornGraphView(this, props.optJSONObject("graph") ?: JSONObject(), tokens).apply {
                background = android.graphics.drawable.GradientDrawable().apply {
                    setColor(Color.argb(210, 5, 18, 17))
                    setStroke(dp(1), tokenColor(tokens, "colorPanelBorder", Color.argb(110, 103, 240, 228)))
                    cornerRadius = dp(6).toFloat()
                }
            }
            "embed.tex" -> LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(dp(10), dp(10), dp(10), dp(10))
                background = panelBackground(tokens, 6)
                val labelText = props.optString("label", "")
                if (labelText.isNotBlank()) addView(label(labelText.uppercase(Locale.US), 11f, tokenColor(tokens, "colorAccent", 0xffff8a2a.toInt()), true))
                addView(label(props.optString("source", ""), 17f, tokenColor(tokens, "colorText", 0xfff6f1e2.toInt()), false))
            }
            "panel.dialogue" -> LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(dp(18), dp(18), dp(18), dp(18))
                background = panelBackground(tokens, 8)
                addView(label(props.optString("speaker", ""), 15f, tokenColor(tokens, "colorAccent", 0xffff8a2a.toInt()), true))
                addView(label(props.optString("text", ""), 20f, tokenColor(tokens, "colorText", 0xfff6f1e2.toInt()), false))
            }
            "rail.actions" -> LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                forEachChild(children) { child ->
                    addView(renderCultUiNode(child, values, tokens), LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
                }
            }
            "layer.embedded-surfaces", "layer.cards" -> FrameLayout(this).apply {
                forEachChild(children) { child ->
                    addView(renderCultUiNode(child, values, tokens), stageParams(child))
                }
            }
            "control.button" -> label(props.optString("label", ""), 14f, tokenColor(tokens, "colorText", 0xfff6f1e2.toInt()), true).apply {
                gravity = Gravity.CENTER
                setPadding(dp(14), dp(12), dp(14), dp(12))
                background = android.graphics.drawable.GradientDrawable().apply {
                    setColor(Color.argb(44, 255, 138, 42))
                    setStroke(dp(1), tokenColor(tokens, "colorAccent", 0xffff8a2a.toInt()))
                    cornerRadius = dp(6).toFloat()
                }
            }
            "image.preview" -> imagePreview(props, tokens)
            "canvas.preview" -> previewBox(props.optString("label", "Canvas"), tokens, square = false)
            "canvas.editor" -> previewBox(props.optString("label", "Editable canvas"), tokens, square = false, tall = true)
            "status.stage" -> LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(dp(12), dp(12), dp(12), dp(12))
                background = panelBackground(tokens, 4)
                addView(label(props.optString("label", "Status"), 12f, tokenColor(tokens, "colorAccent", 0xffff8a2a.toInt()), true))
                addView(label(props.optString("stage", ""), 15f, tokenColor(tokens, "colorText", 0xfff6f1e2.toInt()), true))
                addView(label(props.optString("detail", ""), 12f, tokenColor(tokens, "colorMuted", 0xffd3bb7f.toInt()), false))
            }
            "input.file", "dropzone" -> label(props.optString("label", "Choose File"), 14f, tokenColor(tokens, "colorText", 0xfff6f1e2.toInt()), true).apply {
                gravity = Gravity.CENTER
                setPadding(dp(14), dp(12), dp(14), dp(12))
                background = panelBackground(tokens, 6)
            }
            "input.number", "input.select", "control.range" -> LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                addView(label(props.optString("label", ""), 11f, tokenColor(tokens, "colorAccent", 0xffff8a2a.toInt()), true))
                addView(label(props.optString("value", ""), 13f, tokenColor(tokens, "colorText", 0xfff6f1e2.toInt()), false).apply {
                    setPadding(dp(8), dp(6), dp(8), dp(6))
                    background = panelBackground(tokens, 2)
                })
            }
            "control.toggle" -> label("${props.optString("label", "Toggle")}: ${if (props.optBoolean("value", false)) "on" else "off"}", 12f, tokenColor(tokens, "colorText", 0xfff6f1e2.toInt()), false).apply {
                setPadding(dp(8), dp(6), dp(8), dp(6))
                background = panelBackground(tokens, 2)
            }
            "color.swatch" -> View(this).apply {
                background = android.graphics.drawable.GradientDrawable().apply {
                    setColor(tokenColor(JSONObject().put("value", props.optString("value", "#ffffffff")), "value", Color.WHITE))
                    setStroke(dp(2), tokenColor(tokens, "colorAccent", 0xffff8a2a.toInt()))
                }
                layoutParams = ViewGroup.LayoutParams(dp(38), dp(38))
            }
            "metric" -> LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                addView(label("${props.optString("label", "Metric")}: ${props.opt("value") ?: ""}", 13f, tokenColor(tokens, "colorText", 0xfff6f1e2.toInt()), true))
            }
            "surface" -> LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                forEachChild(children) { addView(renderCultUiNode(it, values, tokens)) }
            }
            "partition" -> LinearLayout(this).apply {
                if (props.optString("role", "") == "inspector.row") {
                    orientation = LinearLayout.HORIZONTAL
                    setPadding(dp(8), dp(4), dp(8), dp(4))
                    background = android.graphics.drawable.GradientDrawable(
                        android.graphics.drawable.GradientDrawable.Orientation.TOP_BOTTOM,
                        intArrayOf(Color.rgb(32, 31, 43), Color.rgb(19, 20, 29))).apply {
                        setStroke(dp(1), Color.argb(16, 255, 255, 255))
                        cornerRadius = dp(4).toFloat()
                    }
                    val labelNode = children?.optJSONObject(0)
                    val fieldNode = children?.optJSONObject(1)
                    if (labelNode != null) {
                        addView(renderCultUiNode(labelNode, values, tokens), LinearLayout.LayoutParams(dp(190), ViewGroup.LayoutParams.WRAP_CONTENT))
                    }
                    if (fieldNode != null) {
                        addView(renderCultUiNode(fieldNode, values, tokens), LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
                    }
                    return@apply
                }
                orientation = if (props.optString("split", "y") == "x") LinearLayout.HORIZONTAL else LinearLayout.VERTICAL
                setPadding(dp(props.optInt("padding", 0)), dp(props.optInt("padding", 0)), dp(props.optInt("padding", 0)), dp(props.optInt("padding", 0)))
                forEachChild(children) { child ->
                    val view = renderCultUiNode(child, values, tokens)
                    val params = LinearLayout.LayoutParams(
                        if (orientation == LinearLayout.HORIZONTAL) 0 else ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT,
                        if (orientation == LinearLayout.HORIZONTAL) 1f else 0f)
                    val gap = dp(props.optInt("gap", 0))
                    params.setMargins(0, 0, if (orientation == LinearLayout.HORIZONTAL) gap else 0, if (orientation == LinearLayout.VERTICAL) gap else 0)
                    addView(view, params)
                }
            }
            "pane", "panel" -> LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(dp(props.optInt("padding", 12)), dp(props.optInt("padding", 12)), dp(props.optInt("padding", 12)), dp(props.optInt("padding", 12)))
                setBackgroundColor(tokenColor(tokens, "colorPanel", Color.rgb(7, 25, 24)))
                background = android.graphics.drawable.GradientDrawable().apply {
                    setColor(tokenColor(tokens, "colorPanel", Color.rgb(7, 25, 24)))
                    setStroke(dp(1), Color.argb(110, 103, 240, 228))
                    cornerRadius = dp(6).toFloat()
                }
                val title = props.optString("title", "")
                if (title.isNotBlank()) addView(label(title, 12f, tokenColor(tokens, "colorMuted", 0xff8ba5a3.toInt()), true))
                forEachChild(children) { addView(renderCultUiNode(it, values, tokens)) }
            }
            "card", "card.external" -> LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(dp(10), dp(10), dp(10), dp(10))
                background = android.graphics.drawable.GradientDrawable().apply {
                    setColor(tokenColor(tokens, "colorPanelAlt", Color.rgb(19, 20, 29)))
                    setStroke(dp(1), Color.argb(24, 255, 255, 255))
                    cornerRadius = dp(4).toFloat()
                }
                val title = props.optString("title", "")
                if (title.isNotBlank()) addView(label(title, 14f, tokenColor(tokens, "colorText", 0xffe7f1f1.toInt()), true))
                forEachChild(children) { addView(renderCultUiNode(it, values, tokens)) }
            }
            "label", "text", "text.title", "text.dialogue" -> {
                val bind = props.optString("bind", "")
                val text = if (bind.isNotBlank()) values.opt(bind)?.toString() ?: "" else props.optString("text", "")
                label(if (kind == "label") text.uppercase(Locale.US) else text, if (kind == "text.title") 18f else 13f, if (kind == "label") tokenColor(tokens, "colorAccent", 0xffffb84f.toInt()) else tokenColor(tokens, "colorText", 0xffe7f1f1.toInt()), kind == "label")
            }
            "control.slider" -> CultSliderView(this, sliderValue(props, values), tokenColor(tokens, "colorAccent", 0xffffb84f.toInt())).apply {
                layoutParams = ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(24))
            }
            else -> LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                forEachChild(children) { addView(renderCultUiNode(it, values, tokens)) }
            }
        }
    }

    private fun stageParams(node: JSONObject): FrameLayout.LayoutParams {
        val kind = node.optString("kind", "")
        val props = node.optJSONObject("props") ?: JSONObject()
        val placement = props.optJSONObject("placement")
        val anchor = placement?.optString("anchor", "") ?: ""
        return when {
            kind == "image.background" -> FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
            kind == "embed.norn" || anchor == "whiteboard" -> FrameLayout.LayoutParams(520, 310).apply { setMargins(54, 46, 0, 0) }
            kind == "embed.tex" || anchor == "whiteboard-equation" -> FrameLayout.LayoutParams(500, 94).apply { setMargins(96, 350, 0, 0) }
            kind.startsWith("layer.") -> FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
            else -> FrameLayout.LayoutParams(300, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.TOP or Gravity.RIGHT).apply { setMargins(0, 52, 32, 0) }
        }
    }

    private fun findChild(children: org.json.JSONArray?, kind: String): JSONObject? {
        if (children == null) return null
        for (index in 0 until children.length()) {
            val child = children.getJSONObject(index)
            if (child.optString("kind", "") == kind) return child
        }
        return null
    }

    private fun panelBackground(tokens: JSONObject, radius: Int): android.graphics.drawable.GradientDrawable {
        return android.graphics.drawable.GradientDrawable().apply {
            setColor(tokenColor(tokens, "colorPanel", Color.rgb(7, 25, 24)))
            setStroke(dp(1), Color.argb(110, 103, 240, 228))
            cornerRadius = dp(radius).toFloat()
        }
    }

    private fun imagePreview(props: JSONObject, tokens: JSONObject): View {
        val labelText = props.optString("label", "Image")
        val assetPath = previewAssetPath(props.optString("src", ""))
        return LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            addView(label(labelText, 12f, tokenColor(tokens, "colorAccent", 0xffff8a2a.toInt()), true))
            val imageView = if (assetPath != null) {
                AssetPreviewView(this@MainActivity, assetPath, props.optDouble("zoom", 1.0), tokenColor(tokens, "colorAccent", 0xffff8a2a.toInt()))
            } else {
                StageBackgroundView(this@MainActivity, labelText, tokenColor(tokens, "colorAccent", 0xffff8a2a.toInt()))
            }
            addView(imageView, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(180)))
        }
    }

    private fun previewAssetPath(source: String): String? = when {
        source.endsWith("/character-input.png") -> "repixelizer/character-input.png"
        source.endsWith("/character-repixelized.png") -> "repixelizer/character-repixelized.png"
        else -> null
    }

    private fun previewBox(labelText: String, tokens: JSONObject, square: Boolean, tall: Boolean = false): View {
        return LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            addView(label(labelText, 12f, tokenColor(tokens, "colorAccent", 0xffff8a2a.toInt()), true))
            addView(StageBackgroundView(this@MainActivity, "waiting for pixels", tokenColor(tokens, "colorAccent", 0xffff8a2a.toInt())), LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                if (square) dp(180) else if (tall) dp(280) else dp(160)
            ))
        }
    }

    private fun forEachChild(children: org.json.JSONArray?, block: (JSONObject) -> Unit) {
        if (children == null) return
        for (index in 0 until children.length()) block(children.getJSONObject(index))
    }

    private fun sliderValue(props: JSONObject, values: JSONObject): Double {
        val min = props.optDouble("min", 0.0)
        val max = props.optDouble("max", 1.0)
        val bind = props.optString("bind", "")
        val value = if (bind.isNotBlank()) values.optDouble(bind, min) else props.optDouble("value", min)
        return if (max == min) 0.0 else ((value - min) / (max - min)).coerceIn(0.0, 1.0)
    }

    private fun tokenColor(tokens: JSONObject, name: String, fallback: Int): Int {
        val value = tokens.optString(name, "")
        if (!value.startsWith("#") || value.length != 7) return fallback
        return Color.rgb(value.substring(1, 3).toInt(16), value.substring(3, 5).toInt(16), value.substring(5, 7).toInt(16))
    }

    override fun onDestroy() {
        super.onDestroy()
        mediaRunning = false
        sensorManager?.unregisterListener(this)
        audioRecord?.stop()
        audioRecord?.release()
        cameraSession?.close()
        cameraDevice?.close()
        imageReader?.close()
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
        mediaText = card("media sensors\nwaiting for camera/mic permissions")
        providerPicker = Spinner(this).apply {
            setPadding(dp(8), dp(6), dp(8), dp(6))
            background = android.graphics.drawable.GradientDrawable().apply {
                setColor(Color.rgb(7, 25, 24))
                setStroke(dp(1), 0xff345f5f.toInt())
                cornerRadius = dp(4).toFloat()
            }
            onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
                override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) = Unit

                override fun onNothingSelected(parent: AdapterView<*>?) = Unit
            }
        }
        providerOptionsList = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
        }
        surfaceList = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        root.addView(brokerText)
        root.addView(selectedText)
        root.addView(label("Daemon", 11f, 0xff8efcff.toInt(), true).apply {
            setPadding(0, dp(14), 0, dp(4))
        })
        root.addView(providerPicker)
        root.addView(providerOptionsList)
        root.addView(surfaceList)
        root.addView(sensorText)
        root.addView(mediaText)
        root.addView(touchText)
        root.addView(card("contract\nPeriwinkle consumes mimir.eve_dashboard_state.v1, sends mimir.eve_dashboard_command.v1, and publishes mimir.eve_sensor_observation.v1 plus mimir.eve_media_observation.v1. Mimir accepts meaning; Android renders and observes."))
        return scroll
    }

    private fun label(text: String, sp: Float, color: Int, title: Boolean): TextView =
        TextView(this).apply {
            this.text = text
            setTextSize(if (parityFixtureMode) TypedValue.COMPLEX_UNIT_PX else TypedValue.COMPLEX_UNIT_SP, sp)
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
        renderProviderPicker(state)
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

    private fun renderProviderPicker(state: EveDashboardStateDocument) {
        val nodes = state.nodes
            .filter { it.command == "open-provider" && !it.providerId.isNullOrBlank() }
            .distinctBy { it.providerId }
        if (nodes.isNotEmpty()) providerPickerNodes = nodes
        val labels = providerPickerNodes.map { "${it.label}  /  ${it.providerId}" }
        if (labels.isEmpty()) {
            providerPicker.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, listOf("Waiting for daemon providers")).apply {
                setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
            }
            providerPicker.isEnabled = false
            return
        }
        val adapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, labels).apply {
            setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        }
        providerPicker.adapter = adapter
        val selectedIndex = providerPickerNodes.indexOfFirst {
            it.providerId == state.providerId || it.id == state.selectedNodeId
        }.coerceAtLeast(0)
        providerPicker.setSelection(selectedIndex, false)
        providerPicker.isEnabled = true
        renderProviderOptions(state)
    }

    private fun renderProviderOptions(state: EveDashboardStateDocument) {
        providerOptionsList.removeAllViews()
        providerPickerNodes.forEach { node ->
            val active = node.providerId == state.providerId || node.id == state.selectedNodeId
            providerOptionsList.addView(label("${if (active) "> " else "  "}${node.label}\n${node.providerId}", 13f, if (active) 0xff8efcff.toInt() else 0xffe6f1f1.toInt(), active).apply {
                setPadding(dp(12), dp(8), dp(12), dp(8))
                background = android.graphics.drawable.GradientDrawable().apply {
                    setColor(if (active) Color.rgb(22, 58, 55) else Color.rgb(7, 25, 24))
                    setStroke(dp(1), 0xff345f5f.toInt())
                    cornerRadius = dp(4).toFloat()
                }
                setOnClickListener { sendCommand("open-provider", node) }
            }, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
                setMargins(0, dp(6), 0, 0)
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

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 42) startLocalMedia()
    }

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

    private fun requestMediaPermissionsAndStart() {
        val missing = arrayOf(Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO)
            .filter { checkSelfPermission(it) != PackageManager.PERMISSION_GRANTED }
            .toTypedArray()
        if (missing.isNotEmpty()) {
            requestPermissions(missing, 42)
            return
        }

        startLocalMedia()
    }

    private fun startLocalMedia() {
        if (mediaRunning) return
        mediaRunning = true
        startMicrophone()
        startCamera()
    }

    @Suppress("MissingPermission")
    private fun startMicrophone() {
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            main.post { mediaText.text = "media sensors\nmicrophone permission missing" }
            return
        }

        workers.execute {
            val sampleRate = 16_000
            val minBuffer = AudioRecord.getMinBufferSize(sampleRate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT)
            if (minBuffer <= 0) {
                main.post { mediaText.text = "media sensors\nAudioRecord unavailable" }
                return@execute
            }

            val blockBytes = 3_200
            val record = AudioRecord(MediaRecorder.AudioSource.MIC, sampleRate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT, minBuffer.coerceAtLeast(blockBytes * 2))
            audioRecord = record
            val buffer = ByteArray(blockBytes)
            record.startRecording()
            while (mediaRunning && !Thread.currentThread().isInterrupted) {
                val read = record.read(buffer, 0, buffer.size)
                if (read > 0) {
                    val payload = buffer.copyOf(read)
                    val elapsedNs = SystemClock.elapsedRealtimeNanos()
                    val sequence = ++mediaSequence
                    main.post { mediaText.text = "media sensors\nmicrophone pcm16le seq=$sequence bytes=$read rate=$sampleRate" }
                    sendMediaObservation(
                        kind = "microphone-pcm16-block",
                        streamId = "periwinkle-mic",
                        sequence = sequence,
                        sensorTimestampNs = elapsedNs,
                        elapsedNs = elapsedNs,
                        format = "pcm16le",
                        sampleRate = sampleRate,
                        channels = 1,
                        frameCount = read / 2,
                        payload = payload)
                }
            }
        }
    }

    @Suppress("MissingPermission", "DEPRECATION")
    private fun startCamera() {
        if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            main.post { mediaText.text = "media sensors\ncamera permission missing" }
            return
        }

        val manager = getSystemService(CAMERA_SERVICE) as CameraManager
        val cameraId = manager.cameraIdList.firstOrNull { id ->
            manager.getCameraCharacteristics(id).get(CameraCharacteristics.LENS_FACING) == CameraCharacteristics.LENS_FACING_BACK
        } ?: manager.cameraIdList.firstOrNull()
        if (cameraId == null) {
            main.post { mediaText.text = "media sensors\ncamera unavailable" }
            return
        }

        imageReader = ImageReader.newInstance(160, 120, ImageFormat.YUV_420_888, 2).apply {
            setOnImageAvailableListener({ reader ->
                val image = reader.acquireLatestImage() ?: return@setOnImageAvailableListener
                handleCameraImage(image)
            }, main)
        }

        manager.openCamera(cameraId, object : CameraDevice.StateCallback() {
            override fun onOpened(camera: CameraDevice) {
                cameraDevice = camera
                val reader = imageReader ?: return
                val request = camera.createCaptureRequest(CameraDevice.TEMPLATE_PREVIEW).apply {
                    addTarget(reader.surface)
                }
                camera.createCaptureSession(listOf(reader.surface), object : CameraCaptureSession.StateCallback() {
                    override fun onConfigured(session: CameraCaptureSession) {
                        cameraSession = session
                        session.setRepeatingRequest(request.build(), null, main)
                    }

                    override fun onConfigureFailed(session: CameraCaptureSession) {
                        mediaText.text = "media sensors\ncamera session configure failed"
                    }
                }, main)
            }

            override fun onDisconnected(camera: CameraDevice) {
                camera.close()
            }

            override fun onError(camera: CameraDevice, error: Int) {
                mediaText.text = "media sensors\ncamera error=$error"
                camera.close()
            }
        }, main)
    }

    private fun handleCameraImage(image: Image) {
        image.use {
            val elapsedNs = SystemClock.elapsedRealtimeNanos()
            if (elapsedNs - lastCameraSentElapsedNs < 200_000_000L) return
            lastCameraSentElapsedNs = elapsedNs
            val payload = copyLumaPlane(image)
            val sequence = ++mediaSequence
            mediaText.text = "media sensors\ncamera y8 seq=$sequence ${image.width}x${image.height} bytes=${payload.size}"
            sendMediaObservation(
                kind = "camera-luma-frame",
                streamId = "periwinkle-camera",
                sequence = sequence,
                sensorTimestampNs = image.timestamp,
                elapsedNs = elapsedNs,
                format = "y8",
                width = image.width,
                height = image.height,
                frameCount = 1,
                payload = payload)
        }
    }

    private fun copyLumaPlane(image: Image): ByteArray {
        val plane = image.planes[0]
        val buffer = plane.buffer
        val rowStride = plane.rowStride
        val pixelStride = plane.pixelStride
        val data = ByteArray(image.width * image.height)
        var out = 0
        for (y in 0 until image.height) {
            val rowStart = y * rowStride
            for (x in 0 until image.width) {
                data[out++] = buffer.get(rowStart + x * pixelStride)
            }
        }
        return data
    }

    private fun sendMediaObservation(
        kind: String,
        streamId: String,
        sequence: Long,
        sensorTimestampNs: Long,
        elapsedNs: Long,
        format: String,
        width: Int? = null,
        height: Int? = null,
        sampleRate: Int? = null,
        channels: Int? = null,
        frameCount: Int? = null,
        payload: ByteArray,
    ) {
        val socket = sensorSocket ?: return
        val observation = EveMediaObservationDocument(
            observationId = "$deviceId:$kind:$sequence",
            deviceId = deviceId,
            streamId = streamId,
            kind = kind,
            sequence = sequence,
            sensorTimestampNs = sensorTimestampNs,
            elapsedRealtimeNs = elapsedNs,
            wallClockUtc = utcNow(),
            clockDomainId = "periwinkle-elapsed-realtime",
            format = format,
            width = width,
            height = height,
            sampleRate = sampleRate,
            channels = channels,
            frameCount = frameCount,
            payloadEncoding = "raw",
            payload = payload,
        )
        mesh.remember(EveMediaObservationDocument, observation.observationId, observation)
        workers.execute {
            runCatching { socket.sendBinary(EveMediaObservationDocument.encode(observation)) }
                .onFailure {
                    sensorSocket?.close()
                    sensorSocket = null
                    connectSensorUplink()
                }
        }
    }

    private fun postBroker(text: String) = main.post { brokerText.text = text }
    private fun postSensor(text: String) = main.post { sensorText.text = text }
    private fun dp(value: Int): Int =
        if (parityFixtureMode) value else (value * resources.displayMetrics.density + 0.5f).toInt()

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

private class CultSliderView(
    context: Context,
    private val value: Double,
    private val accent: Int,
) : View(context) {
    private val trackPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.argb(87, 0, 0, 0) }
    private val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = accent }
    private val glowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.argb(115, Color.red(accent), Color.green(accent), Color.blue(accent))
        maskFilter = android.graphics.BlurMaskFilter(7f, android.graphics.BlurMaskFilter.Blur.NORMAL)
    }
    private val thumbPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = accent }

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        val desiredHeight = (24f * resources.displayMetrics.density + 0.5f).toInt()
        val width = MeasureSpec.getSize(widthMeasureSpec)
        val height = resolveSize(desiredHeight, heightMeasureSpec)
        setMeasuredDimension(width, height)
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val centerY = height / 2f
        val left = paddingLeft.toFloat()
        val right = (width - paddingRight).toFloat()
        val track = RectF(left, centerY - 3f, right, centerY + 3f)
        val fillRight = left + ((right - left) * value).toFloat()
        val fill = RectF(left, centerY - 3f, fillRight, centerY + 3f)
        canvas.drawRoundRect(track, 2f, 2f, trackPaint)
        canvas.drawRoundRect(fill, 2f, 2f, fillPaint)
        canvas.drawCircle(fillRight, centerY, 10f, glowPaint)
        canvas.drawCircle(fillRight, centerY, 6f, thumbPaint)
    }
}

private class StageBackgroundView(
    context: Context,
    private val sceneLabel: String,
    private val accent: Int
) : View(context) {
    private val backgroundPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.rgb(5, 8, 13) }
    private val gridPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.argb(28, Color.red(accent), Color.green(accent), Color.blue(accent))
        strokeWidth = 1f
    }
    private val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.rgb(183, 199, 217)
        textSize = 14f * resources.displayMetrics.scaledDensity
        typeface = android.graphics.Typeface.DEFAULT_BOLD
    }

    override fun onDraw(canvas: Canvas) {
        canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), backgroundPaint)
        val step = 32f * resources.displayMetrics.density
        var x = 0f
        while (x < width) {
            canvas.drawLine(x, 0f, x, height.toFloat(), gridPaint)
            x += step
        }
        var y = 0f
        while (y < height) {
            canvas.drawLine(0f, y, width.toFloat(), y, gridPaint)
            y += step
        }
        canvas.drawText(sceneLabel, 28f * resources.displayMetrics.density, 36f * resources.displayMetrics.density, textPaint)
    }
}

private class AssetPreviewView(
    context: Context,
    assetPath: String,
    private val zoom: Double,
    accent: Int
) : View(context) {
    private val bitmap = context.assets.open(assetPath).use { BitmapFactory.decodeStream(it) }
    private val backgroundPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.rgb(5, 8, 13) }
    private val gridPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.argb(28, Color.red(accent), Color.green(accent), Color.blue(accent))
        strokeWidth = 1f
    }
    private val destination = Rect()
    private val source = Rect()

    override fun onDraw(canvas: Canvas) {
        canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), backgroundPaint)
        val step = 32f
        var x = 0f
        while (x < width) {
            canvas.drawLine(x, 0f, x, height.toFloat(), gridPaint)
            x += step
        }
        var y = 0f
        while (y < height) {
            canvas.drawLine(0f, y, width.toFloat(), y, gridPaint)
            y += step
        }

        val scale = if (zoom > 1.0) zoom.toFloat() else maxOf(width / bitmap.width.toFloat(), height / bitmap.height.toFloat())
        val sourceWidth = (width / scale).toInt().coerceIn(1, bitmap.width)
        val sourceHeight = (height / scale).toInt().coerceIn(1, bitmap.height)
        val left = ((bitmap.width - sourceWidth) / 2).coerceAtLeast(0)
        val top = ((bitmap.height - sourceHeight) / 2).coerceAtLeast(0)
        source.set(left, top, left + sourceWidth, top + sourceHeight)
        destination.set(0, 0, width, height)
        canvas.drawBitmap(bitmap, source, destination, null)
    }
}

private class NornGraphView(
    context: Context,
    private val graph: JSONObject,
    private val tokens: JSONObject
) : View(context) {
    private val density = resources.displayMetrics.density
    private val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = colorToken("colorText", Color.rgb(246, 241, 226))
        textSize = 13f * resources.displayMetrics.scaledDensity
        textAlign = Paint.Align.CENTER
        typeface = android.graphics.Typeface.DEFAULT_BOLD
    }
    private val edgePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.argb(120, 183, 199, 217)
        strokeWidth = 2f * density
    }

    override fun onDraw(canvas: Canvas) {
        val nodes = graph.optJSONArray("nodes") ?: return
        val edges = graph.optJSONArray("edges")
        val points = mutableMapOf<String, android.graphics.PointF>()
        for (index in 0 until nodes.length()) {
            val node = nodes.getJSONObject(index)
            val id = node.optString("id", "")
            points[id] = android.graphics.PointF((node.optDouble("x", 0.5) * width).toFloat(), (node.optDouble("y", 0.5) * height).toFloat())
        }
        if (edges != null) {
            for (index in 0 until edges.length()) {
                val edge = edges.getJSONObject(index)
                val source = points[edge.optString("source", "")]
                val target = points[edge.optString("target", "")]
                if (source != null && target != null) canvas.drawLine(source.x, source.y, target.x, target.y, edgePaint)
            }
        }
        val nodePaint = Paint(Paint.ANTI_ALIAS_FLAG)
        val strokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.STROKE
            strokeWidth = 2f * density
        }
        for (index in 0 until nodes.length()) {
            val node = nodes.getJSONObject(index)
            val point = points[node.optString("id", "")] ?: continue
            val current = node.optBoolean("current", false)
            nodePaint.color = if (current) colorToken("colorAccent", Color.rgb(255, 138, 42)) else Color.rgb(20, 20, 29)
            strokePaint.color = if (current) colorToken("colorAccent", Color.rgb(255, 138, 42)) else Color.argb(140, 103, 240, 228)
            val radius = (if (current) 24f else 20f) * density
            canvas.drawCircle(point.x, point.y, radius, nodePaint)
            canvas.drawCircle(point.x, point.y, radius, strokePaint)
            canvas.drawText(node.optString("label", node.optString("id", "")), point.x, point.y + radius + 20f * density, textPaint)
        }
    }

    private fun colorToken(name: String, fallback: Int): Int {
        val value = tokens.optString(name, "")
        if (!value.startsWith("#") || value.length != 7) return fallback
        return Color.rgb(value.substring(1, 3).toInt(16), value.substring(3, 5).toInt(16), value.substring(5, 7).toInt(16))
    }
}
