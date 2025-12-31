import 'package:flutter/material.dart';
import 'api.dart';

class AttendancePage extends StatefulWidget {
  const AttendancePage({super.key});

  @override
  State<AttendancePage> createState() => _AttendancePageState();
}

class _AttendancePageState extends State<AttendancePage> {
  final days = const ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  final statuses = const ["Present", "Absent", "Late"];

  String selectedDay = "Monday";
  int? selectedClassId;

  List<dynamic> classes = [];
  List<dynamic> students = [];

  bool loadingClasses = true;
  bool loadingStudents = false;
  bool saving = false;

  final Map<int, String> statusMap = {};

  @override
  void initState() {
    super.initState();
    loadClasses();
  }

  Future<void> loadClasses() async {
    setState(() => loadingClasses = true);
    classes = await Api.getClasses();
    if (classes.isNotEmpty) {
      selectedClassId = classes.first["id"];
    }
    setState(() => loadingClasses = false);
    await loadStudentsAndAttendance();
  }

  int _weekdayNumber(String day) {
    switch (day) {
      case "Monday":
        return DateTime.monday;
      case "Tuesday":
        return DateTime.tuesday;
      case "Wednesday":
        return DateTime.wednesday;
      case "Thursday":
        return DateTime.thursday;
      case "Friday":
        return DateTime.friday;
      default:
        return DateTime.monday;
    }
  }

  String _getDateForDay() {
    final today = DateTime.now();
    final target = _weekdayNumber(selectedDay);
    int diff = target - today.weekday;
    if (diff < 0) diff += 7;
    final date = today.add(Duration(days: diff));
    return "${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}";
  }

  Future<void> loadStudentsAndAttendance() async {
    if (selectedClassId == null) return;

    setState(() {
      loadingStudents = true;
      students = [];
      statusMap.clear();
    });

    final date = _getDateForDay();

    students = await Api.getStudentsByClass(selectedClassId!);
    final existing =
    await Api.getAttendanceForClassDate(selectedClassId!, date);

    for (final s in students) {
      final id = s["id"];
      statusMap[id] = existing[id] ?? "Absent";
    }

    setState(() => loadingStudents = false);
  }

  Future<void> saveAttendance() async {
    if (selectedClassId == null) return;

    setState(() => saving = true);

    final date = _getDateForDay();

    final items = students
        .map((s) => {
      "student_id": s["id"],
      "status": statusMap[s["id"]] ?? "Absent",
    })
        .toList();

    await Api.saveAttendanceBulk(selectedClassId!, date, items);

    setState(() => saving = false);

    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text("Attendance saved ✅")),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Attendance")),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            DropdownButtonFormField<String>(
              value: selectedDay,
              decoration: const InputDecoration(
                labelText: "Select Day",
                border: OutlineInputBorder(),
              ),
              items: days
                  .map((d) => DropdownMenuItem(value: d, child: Text(d)))
                  .toList(),
              onChanged: (v) async {
                if (v == null) return;
                setState(() => selectedDay = v);
                await loadStudentsAndAttendance();
              },
            ),
            const SizedBox(height: 10),
            loadingClasses
                ? const LinearProgressIndicator()
                : DropdownButtonFormField<int>(
              value: selectedClassId,
              decoration: const InputDecoration(
                labelText: "Select Class",
                border: OutlineInputBorder(),
              ),
              items: classes
                  .map((c) => DropdownMenuItem<int>(
                value: c["id"],
                child: Text(c["class_name"]),
              ))
                  .toList(),
              onChanged: (v) async {
                if (v == null) return;
                setState(() => selectedClassId = v);
                await loadStudentsAndAttendance();
              },
            ),
            const SizedBox(height: 12),
            Expanded(
              child: loadingStudents
                  ? const Center(child: CircularProgressIndicator())
                  : ListView.builder(
                itemCount: students.length,
                itemBuilder: (context, i) {
                  final s = students[i];
                  return Card(
                    child: ListTile(
                      title: Text(s["full_name"]),
                      subtitle: Text("Code: ${s["student_code"]}"),
                      trailing: DropdownButton<String>(
                        value: statusMap[s["id"]],
                        items: statuses
                            .map((st) => DropdownMenuItem(
                          value: st,
                          child: Text(st),
                        ))
                            .toList(),
                        onChanged: (v) =>
                            setState(() => statusMap[s["id"]] = v!),
                      ),
                    ),
                  );
                },
              ),
            ),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: saving ? null : saveAttendance,
                child: saving
                    ? const CircularProgressIndicator()
                    : const Text("Save Attendance"),
              ),
            )
          ],
        ),
      ),
    );
  }
}
