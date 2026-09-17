package com.aarogyanirman.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PdfExportPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
