import 'package:flutter/material.dart';
import 'api.dart';

class StudentsPage extends StatefulWidget {
  const StudentsPage({super.key});

  @override
  State<StudentsPage> createState() => _StudentsPageState();

}

class _StudentsPageState extends State<StudentsPage> {
  List<dynamic> students = [];
  bool loading = true;

  @override
  void initState() {
    super.initState();
    loadStudents();
  }

  Future<void> loadStudents() async {
    setState(() => loading = true);
    students = await Api.getStudents();
    setState(() => loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Students"),
        actions: [
          IconButton(
            onPressed: loadStudents,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : students.isEmpty
          ? const Center(child: Text("No students found"))
          : ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: students.length,
        itemBuilder: (context, i) {
          final s = students[i];
          return Card(
            child: ListTile(
              leading: CircleAvatar(
                child: Text("${s["id"]}"),
              ),
              title: Text(s["full_name"] ?? ""),
              subtitle: Text("Code: ${s["student_code"] ?? ""}"),
            ),
          );
        },
      ),
    );
  }
}
