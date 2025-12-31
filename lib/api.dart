import 'dart:convert';
import 'package:http/http.dart' as http;

class Api {
  static const String baseUrl =
      "https://attendance-api-production-de0c.up.railway.app";

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

  static Future<void> markAttendance(int studentId, String date, String status) async {
    await http.post(
      Uri.parse("$baseUrl/attendance"),
      headers: {"Content-Type": "application/json"},
      body: jsonEncode({
        "student_id": studentId,
        "date": date,
        "status": status,
      }),
    );
  }

  static Future<List<dynamic>> getAttendanceByDate(String date) async {
    final res = await http.get(Uri.parse("$baseUrl/attendance?date=$date"));
    final data = jsonDecode(res.body);
    return data["records"] ?? [];
  }
}
