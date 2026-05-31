package org.gamecult.eve;

import android.app.Activity;
import android.graphics.Color;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class MainActivity extends Activity implements SensorEventListener {
    private final Handler main = new Handler(Looper.getMainLooper());
    private final ExecutorService network = Executors.newSingleThreadExecutor();

    private SensorManager sensorManager;
    private TextView brokerText;
    private TextView sensorText;
    private TextView touchText;
    private long touchSequence;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        sensorManager = (SensorManager) getSystemService(SENSOR_SERVICE);
        setContentView(buildUi());
        startSensors();
        pollBroker();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (sensorManager != null) {
            sensorManager.unregisterListener(this);
        }
        network.shutdownNow();
    }

    private ScrollView buildUi() {
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(Color.rgb(2, 9, 9));

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(18), dp(18), dp(18), dp(18));
        scroll.addView(root, new ScrollView.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT));

        TextView title = label("EVE / PERIWINKLE", 26, 0xff8efcff, true);
        root.addView(title);
        root.addView(label("CultMesh streaming UI client\nAndroid native proof", 14, 0xffb7c7c7, false));

        brokerText = card("CultNet broker\nconnecting to Mimir at 192.168.1.66:8795");
        sensorText = card("timestamped sensors\nwaiting for accelerometer / gyro");
        touchText = card("touch surface\nwaiting for operator input");
        root.addView(brokerText);
        root.addView(sensorText);
        root.addView(touchText);

        TextView contract = card("contract\nBrowser is the reference renderer. Periwinkle renders the same Eve surface documents natively and publishes timestamped local signals back into the mesh.");
        root.addView(contract);
        return scroll;
    }

    private TextView label(String text, int sp, int color, boolean title) {
        TextView view = new TextView(this);
        view.setText(text);
        view.setTextSize(sp);
        view.setTextColor(color);
        view.setGravity(Gravity.START);
        view.setIncludeFontPadding(true);
        view.setTypeface(android.graphics.Typeface.MONOSPACE, title ? android.graphics.Typeface.BOLD : android.graphics.Typeface.NORMAL);
        return view;
    }

    private TextView card(String text) {
        TextView view = label(text, 14, 0xffe6f1f1, false);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT);
        params.setMargins(0, dp(14), 0, 0);
        view.setLayoutParams(params);
        view.setPadding(dp(14), dp(12), dp(14), dp(12));
        view.setBackgroundColor(Color.rgb(7, 25, 24));
        return view;
    }

    private void startSensors() {
        if (sensorManager == null) {
            sensorText.setText("timestamped sensors\nSensorManager unavailable");
            return;
        }
        Sensor accel = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
        Sensor gyro = sensorManager.getDefaultSensor(Sensor.TYPE_GYROSCOPE);
        if (accel != null) {
            sensorManager.registerListener(this, accel, SensorManager.SENSOR_DELAY_GAME);
        }
        if (gyro != null) {
            sensorManager.registerListener(this, gyro, SensorManager.SENSOR_DELAY_GAME);
        }
    }

    private void pollBroker() {
        network.execute(new Runnable() {
            @Override
            public void run() {
            String text;
            try {
                URL url = new URL("http://192.168.1.66:8795/health");
                HttpURLConnection connection = (HttpURLConnection) url.openConnection();
                connection.setConnectTimeout(1200);
                connection.setReadTimeout(1200);
                int status = connection.getResponseCode();
                BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream(), StandardCharsets.UTF_8));
                StringBuilder body = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    body.append(line);
                }
                text = "CultNet broker\nHTTP " + status + "\n" + body;
            } catch (Exception ex) {
                text = "CultNet broker\nwaiting for Mimir\n" + ex.getClass().getSimpleName() + ": " + ex.getMessage();
            }
            final String finalText = text;
            main.post(new Runnable() {
                @Override
                public void run() {
                    brokerText.setText(finalText);
                }
            });
            main.postDelayed(new Runnable() {
                @Override
                public void run() {
                    pollBroker();
                }
            }, 2000);
            }
        });
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        long elapsedNs = SystemClock.elapsedRealtimeNanos();
        String name = event.sensor.getName();
        sensorText.setText(String.format(Locale.US,
                "timestamped sensors\n%s\nsensorTs=%d\nelapsedNs=%d\nx=%+.3f y=%+.3f z=%+.3f",
                name,
                event.timestamp,
                elapsedNs,
                event.values.length > 0 ? event.values[0] : 0.0f,
                event.values.length > 1 ? event.values[1] : 0.0f,
                event.values.length > 2 ? event.values[2] : 0.0f));
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {
    }

    @Override
    public boolean dispatchTouchEvent(MotionEvent event) {
        touchSequence++;
        touchText.setText(String.format(Locale.US,
                "touch surface\nseq=%d action=%d pointers=%d eventTime=%d x=%.1f y=%.1f",
                touchSequence,
                event.getActionMasked(),
                event.getPointerCount(),
                event.getEventTime(),
                event.getX(),
                event.getY()));
        return super.dispatchTouchEvent(event);
    }

    private int dp(int value) {
        return (int) (value * getResources().getDisplayMetrics().density + 0.5f);
    }
}
