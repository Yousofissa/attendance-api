import 'package:flutter/material.dart';
import 'api.dart';

void main() => runApp(const MyApp());

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Attendance',
      theme: ThemeData(useMaterial3: true),
      home: const StudentsPage(),
    );
  }
}

class StudentsPage extends StatefulWidget {
  const StudentsPage({super.key});

  @override
  State<StudentsPage> createState() => _StudentsPageState();
}

class _StudentsPageState extends State<StudentsPage> {
  List<dynamic> students = [];
  bool loading = true;

  final nameCtrl = TextEditingController();
  final codeCtrl = TextEditingController();

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

  Future<void> addStudent() async {
    final name = nameCtrl.text.trim();
    final code = codeCtrl.text.trim();
    if (name.isEmpty || code.isEmpty) return;

    await Api.addStudent(name, code);
    nameCtrl.clear();
    codeCtrl.clear();
    await loadStudents();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Students")),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            TextField(
              controller: nameCtrl,
              decoration: const InputDecoration(
                labelText: "Full name",
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: codeCtrl,
              decoration: const InputDecoration(
                labelText: "Student code",
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: addStudent,
                child: const Text("Add Student"),
              ),
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                const Text("Students List", style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                const Spacer(),
                IconButton(onPressed: loadStudents, icon: const Icon(Icons.refresh)),
              ],
            ),
            const SizedBox(height: 8),
            Expanded(
              child: loading
                  ? const Center(child: CircularProgressIndicator())
                  : ListView.builder(
                itemCount: students.length,
                itemBuilder: (context, i) {
                  final s = students[i];
                  return Card(
                    child: ListTile(
                      title: Text(s["full_name"] ?? ""),
                      subtitle: Text("Code: ${s["student_code"]}"),
                      trailing: Text("ID: ${s["id"]}"),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
