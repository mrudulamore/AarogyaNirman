package com.aarogyanirman.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.OutputStream;

/** Save to the user's chosen document provider without broad storage permissions. */
@CapacitorPlugin(name = "PdfExport")
public class PdfExportPlugin extends Plugin {
    @PluginMethod
    public void savePdf(PluginCall call) {
        String filename = call.getString("filename");
        String data = call.getString("base64");
        if (filename == null || data == null || data.isEmpty()) {
            call.reject("PDF filename and contents are required.");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/pdf");
        intent.putExtra(Intent.EXTRA_TITLE, filename);
        try { startActivityForResult(call, intent, "saveResult"); }
        catch (Exception error) { call.reject("Could not open the system file picker.", error); }
    }

    @ActivityCallback
    private void saveResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK) {
            JSObject response = new JSObject();
            response.put("cancelled", true);
            call.resolve(response);
            return;
        }
        Uri uri = result.getData() == null ? null : result.getData().getData();
        if (uri == null) { call.reject("No save location was returned. Please retry."); return; }
        new Thread(() -> {
            try (OutputStream output = getContext().getContentResolver().openOutputStream(uri, "w")) {
                if (output == null) throw new IllegalStateException("Cannot open the selected destination.");
                byte[] bytes = Base64.decode(call.getString("base64", ""), Base64.DEFAULT);
                if (bytes.length < 5 || bytes[0] != '%' || bytes[1] != 'P' || bytes[2] != 'D' || bytes[3] != 'F' || bytes[4] != '-') {
                    throw new IllegalArgumentException("Invalid PDF data.");
                }
                output.write(bytes);
                output.flush();
            } catch (Exception error) {
                call.reject("Could not save the PDF. Check available space and try another location.", error);
                return;
            }
            call.resolve(new JSObject());
        }, "pdf-save").start();
    }
}
