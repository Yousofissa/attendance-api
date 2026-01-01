import 'package:flutter/material.dart';
import 'classes_page.dart';
import 'attendance_page.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Student Attendance',
      theme: ThemeData(useMaterial3: true),
      home: const HomeTabs(),
    );
  }
}

class HomeTabs extends StatefulWidget {
  const HomeTabs({super.key});

  @override
  State<HomeTabs> createState() => _HomeTabsState();
}

class _HomeTabsState extends State<HomeTabs> {
  int idx = 0;

  final List<Widget> pages = [
    const ClassesPage(),
    const AttendancePage(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: pages[idx],
      bottomNavigationBar: NavigationBar(
        selectedIndex: idx,
        onDestinationSelected: (v) => setState(() => idx = v),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.class_),
            label: "Classes",
          ),
          NavigationDestination(
            icon: Icon(Icons.checklist),
            label: "Attendance",
          ),
        ],
      ),
    );
  }
}
