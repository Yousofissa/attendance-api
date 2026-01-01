import 'package:flutter/material.dart';
import 'api.dart';

class ClassStudentsPage extends StatefulWidget {
  final int classId;
  final String className;

  const ClassStudentsPage({
    super.key,
    required this.classId,
    required this.className,
  });

  @override
  State<ClassStudentsPage> createState() => _ClassStudentsPageState();
}

class _ClassStudentsPageState extends State<ClassStudentsPage> {
  List<dynamic> students = [];
  bool loading = true;

  @override
  void initState() {
    super.initState();
    loadStudents();
  }

  Future<void> loadStudents() async {
    setState(() => loading = true);
    students = await Api.getStudentsByClass(widget.classId);
    setState(() => loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.className),
        actions: [
          IconButton(onPressed: loadStudents, icon: const Icon(Icons.refresh)),
        ],
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : students.isEmpty
          ? const Center(child: Text("No students enrolled in this class"))
          : ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: students.length,
        itemBuilder: (context, i) {
          final s = students[i];
          return Card(
            child: ListTile(
              title: Text(s["full_name"] ?? ""),
              subtitle: Text("Student Code: ${s["student_code"] ?? ""}"),
              trailing: Text("ID: ${s["id"]}"),
            ),
          );
        },
      ),
    );
  }
}
