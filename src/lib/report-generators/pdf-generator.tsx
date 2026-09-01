import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import type { ReportPayload } from "./types";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  h1: { fontSize: 18, marginBottom: 4 },
  meta: { marginBottom: 16, color: "#555" },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#ddd", paddingVertical: 4 },
  cell: { flex: 1, paddingRight: 6 },
  head: { fontWeight: 700, backgroundColor: "#0f172a", color: "#fff", padding: 6 },
});

export async function generatePdfBuffer(payload: ReportPayload) {
  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>BISPOS Digital Directory — {payload.title}</Text>
        <Text style={styles.meta}>Generated {payload.generatedAt}</Text>
        <View style={[styles.row, styles.head]}>
          {payload.columns.map((c) => (
            <Text key={c} style={styles.cell}>
              {c}
            </Text>
          ))}
        </View>
        {payload.rows.map((row, i) => (
          <View key={i} style={styles.row}>
            {payload.columns.map((c) => (
              <Text key={c} style={styles.cell}>
                {String(row[c] ?? "")}
              </Text>
            ))}
          </View>
        ))}
      </Page>
    </Document>
  );

  const blob = await pdf(doc).toBlob();
  return Buffer.from(await blob.arrayBuffer());
}
