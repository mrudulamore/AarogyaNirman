package com.aarogyanirman.app;

import android.os.Bundle;
import android.os.SystemClock;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.ViewGroup;
import android.animation.ValueAnimator;
import android.animation.ObjectAnimator;
import android.view.animation.PathInterpolator;
import android.view.animation.AccelerateDecelerateInterpolator;
import android.os.Build;
import android.webkit.WebView;
import android.graphics.Color;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

public class MainActivity extends BridgeActivity {
    private boolean pageLoaded = false;
    private final Handler splashHandler = new Handler(Looper.getMainLooper());
    private ObjectAnimator artworkFloat;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        final long splashStarted = SystemClock.uptimeMillis();
        SplashScreen splashScreen = SplashScreen.installSplashScreen(this);
        bridgeBuilder.addWebViewListener(new WebViewListener() {
            @Override
            public void onPageLoaded(WebView webView) {
                waitForApp(webView, splashStarted);
            }

            @Override
            public void onReceivedError(WebView webView) {
                pageLoaded = true;
            }
        });
        registerPlugin(PdfExportPlugin.class);
        super.onCreate(savedInstanceState);
        configureSystemBars();
        View splash = getLayoutInflater().inflate(R.layout.project_splash, null);
        addContentView(splash, new ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        splashScreen.setOnExitAnimationListener(provider -> {
            boolean animate = Build.VERSION.SDK_INT < 26 || ValueAnimator.areAnimatorsEnabled();
            View content = splash.findViewById(R.id.splash_content);
            View artwork = splash.findViewById(R.id.splash_artwork);
            float density = getResources().getDisplayMetrics().density;
            if (animate) {
                content.setAlpha(0f);
                content.setTranslationY(20 * density);
                content.setScaleX(0.97f);
                content.setScaleY(0.97f);
                content.animate().alpha(1f).translationY(0f).scaleX(1f).scaleY(1f)
                    .setInterpolator(new PathInterpolator(0.22f, 1f, 0.36f, 1f)).setDuration(800).start();
                artworkFloat = ObjectAnimator.ofFloat(artwork, View.TRANSLATION_Y, 0f, -6 * density, 0f);
                artworkFloat.setDuration(1900);
                artworkFloat.setRepeatCount(ValueAnimator.INFINITE);
                artworkFloat.setInterpolator(new AccelerateDecelerateInterpolator());
                artworkFloat.start();
            }
            provider.remove();
            dismissSplashWhenReady(splash, SystemClock.uptimeMillis(), animate);
        });
    }

    private void configureSystemBars() {
        // Draw the native content background beneath transparent system bars,
        // including Android 15/16 where statusBarColor no longer controls this.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        if (Build.VERSION.SDK_INT >= 29) getWindow().setStatusBarContrastEnforced(false);
        WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView())
            .setAppearanceLightStatusBars(false);
        View content = findViewById(android.R.id.content);
        content.setBackgroundColor(getColor(R.color.app_primary));
        ViewCompat.setOnApplyWindowInsetsListener(content, (view, windowInsets) -> {
            Insets bars = windowInsets.getInsets(
                WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            Insets keyboard = windowInsets.getInsets(WindowInsetsCompat.Type.ime());
            view.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, keyboard.bottom));
            // The WebView and splash are already inset: do not apply the safe area twice.
            return WindowInsetsCompat.CONSUMED;
        });
        ViewCompat.requestApplyInsets(content);
    }

    private void dismissSplashWhenReady(View splash, long started, boolean animate) {
        if (isFinishing() || isDestroyed()) return;
        long elapsed = SystemClock.uptimeMillis() - started;
        if (elapsed < 2500 || (!pageLoaded && elapsed < 8000)) {
            splashHandler.postDelayed(() -> dismissSplashWhenReady(splash, started, animate), 100);
            return;
        }
        splash.animate().alpha(0f).setInterpolator(new AccelerateDecelerateInterpolator())
            .setDuration(animate ? 350 : 0).withEndAction(() -> {
            if (artworkFloat != null) artworkFloat.cancel();
            ViewGroup parent = (ViewGroup) splash.getParent();
            if (parent != null) parent.removeView(splash);
        }).start();
    }

    @Override
    public void onDestroy() {
        splashHandler.removeCallbacksAndMessages(null);
        if (artworkFloat != null) artworkFloat.cancel();
        super.onDestroy();
    }

    private void waitForApp(WebView webView, long splashStarted) {
        if (isFinishing() || isDestroyed() || SystemClock.uptimeMillis() - splashStarted >= 8000) return;
        webView.evaluateJavascript(
            "!!document.querySelector('#root > *') && !document.querySelector('#root [aria-label=\"Loading page\"]')",
            result -> {
                if ("true".equals(result)) pageLoaded = true;
                else webView.postDelayed(() -> waitForApp(webView, splashStarted), 100);
            }
        );
    }
}
