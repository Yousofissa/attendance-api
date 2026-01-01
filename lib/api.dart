import 'dart:convert';
import 'package:http/http.dart' as http;

class Api {
  static const String baseUrl =
      "https://attendance-api-production-de0c.up.railway.app";

  // ---------- Students ----------
  static Future<List<dynamic>> getStudents() async {
    final res = await http.get(Uri.parse("$baseUrl/students"));
    final data = jsonDecode(res.body);
    return data["students"] ?? [];
  }

  static Future<void> addStudent(String fullName, String code) async {
    await http.post(
      Uri.parse("$baseUrl/students"),
      headers: {"Content-Type": "application/json"},
      body: jsonEncode({"full_name": fullName, "student_code": code}),
    );
  }

  // ---------- Classes ----------
  static Future<List<dynamic>> getClasses() async {
    final res = await http.get(Uri.parse("$baseUrl/classes"));
    final data = jsonDecode(res.body);
    return data["classes"] ?? [];
  }

  static Future<void> addClass(String className) async {
    await http.post(
      Uri.parse("$baseUrl/classes"),
      headers: {"Content-Type": "application/json"},
      body: jsonEncode({"class_name": className}),
    );
  }

  static Future<List<dynamic>> getStudentsByClass(int classId) async {
    final res = await http.get(Uri.parse("$baseUrl/classes/$classId/students"));
    final data = jsonDecode(res.body);
    return data["students"] ?? [];
  }

  // ---------- Attendance ----------
  static Future<Map<int, String>> getAttendanceForClassDate(int classId,
      String date) async {
    final res = await http.get(
      Uri.parse("$baseUrl/attendance/class?class_id=$classId&date=$date"),
    );
    final data = jsonDecode(res.body);
    final records = (data["records"] ?? []) as List<dynamic>;
    final map = <int, String>{};
    for (final r in records) {
      map[r["student_id"]] = r["status"];
    }
    return map;
  }

  static Future<void> saveAttendanceBulk(int classId,
      String date,
      List<Map<String, dynamic>> items,) async {
    final res = await http.post(
      Uri.parse("$baseUrl/attendance/bulk"),
      headers: {"Content-Type": "application/json"},
      body: jsonEncode({
        "class_id": classId,
        "date": date,
        "items": items,
      }),
    );

    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception("HTTP ${res.statusCode}: ${res.body}");
    }
  }
}
